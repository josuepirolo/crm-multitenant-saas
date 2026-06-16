# Autorização cross-service — arquitetura + handoff de implementação do CRM

> **Handoff para o time de frontend/CRM.** Descreve a arquitetura de
> autorização que liga o CRM (dono do RBAC) aos backends integradores
> (FastAPI-WhatsApp hoje, FastAPI-Instagram/outros amanhã), o **contrato do
> claim** (interface compartilhada) e o **checklist de implementação do lado
> CRM**.
>
> Este documento é a versão entregável do ADR de arquitetura. Quando for
> implementar no repo do CRM, registre-o lá como
> `.sdds/decisions/ADR-006-autorizacao-cross-service-claims-jwt.md` (o lado WA
> já tem o par: `api-zapi-multitenant/.sdds/decisions/ADR-008-...`). Gerado em
> 2026-06-13.

## ⚠️ Decisão que o front precisa fechar antes da migration

**Gramática da chave de permissão.** Hoje `permissions.key` no CRM é
`module:action` com **um único `:`** (ex.: `contacts:view`). As chaves de
integração propostas têm **dois `:`** no estilo
(`integration.whatsapp.instance:manage`). Antes de rodar a migration, confirmar:

1. A resolução granular em `getWorkspaceContext` faz
   `permKeys.includes(\`${module}:${action}\`)` — compara a **chave inteira**,
   então continua correta com dois `:`. ✅
2. **Garantir que nenhum código faça `key.split(':')` assumindo exatamente 2
   partes** — isso quebraria com a chave de integração. Se houver, ajustar para
   `split(':')` por último separador, ou tratar a chave como opaca.
3. Definir `module`/`action` das linhas novas (sugestão:
   `module = 'integration.whatsapp'`, `action = 'instance:manage'`) de forma que
   `${module}:${action}` reconstrua exatamente a `key`.

Detalhe operacional desta decisão no §5.1.

## 1. O problema

O **bearer token é um JWT Supabase compartilhado** por todos os serviços, mas
carrega só identidade (`sub`). Hoje cada backend re-deriva autorização sozinho:

- O CRM tem o RBAC completo no banco (`permissions`, `workspace_roles`,
  `workspace_role_permissions`, `workspace_members.workspace_role_id`) +
  matriz hardcoded de fallback (`src/lib/permissions.ts`), resolvido em
  `src/lib/guards.ts::getWorkspaceContext()`.
- O backend WhatsApp só verifica "é membro do `wa_tenant`?" e nada mais para
  conexão/identidade — e abriu (ADR-007) o precedente de **ler `profiles`
  direto** no banco do CRM.

Generalizar esse precedente é a armadilha: **N integradores × M tabelas
internas do CRM** acoplados, cada um reimplementando código de autorização
multi-tenant → drift → vazamento entre workspaces. E piora a cada novo canal
(Instagram, e-mail, etc.).

## 2. A decisão

**O CRM é o único dono do modelo de autorização. Os integradores nunca leem as
tabelas do CRM — eles consomem o resultado já resolvido, transportado em claims
assinados dentro do JWT Supabase.**

```
CRM (resolve RBAC) ──carimba claim no JWT──► JWT Supabase ──assinatura validada──► cada integrador lê o claim e decide
```

Três pilares:

1. **Catálogo de permissões channel-agnostic** — permissões de integração
   entram como linhas novas no catálogo `permissions` **existente**, com
   namespace por canal: `integration.{canal}.{recurso}:{ação}`.
2. **Custom Access Token Hook** do Supabase resolve o RBAC e injeta o claim
   `authz` no token, **uma vez por emissão** (mantém os integradores stateless).
3. **Contrato de claim versionado** (`v`) — a única superfície que os
   integradores conhecem. Mudou o RBAC interno? Enquanto o formato do claim não
   muda, ninguém quebra.

## 3. Contrato do claim `authz` (interface compartilhada — **congelar isto**)

Claim adicionado ao access token. Namespace de chave custom + versão:

```jsonc
{
  // ...claims padrão do Supabase (sub, email, role, exp, ...)
  "https://lekazis.app/authz": {
    "v": 1,                          // versão do contrato; bump = breaking
    "superadmin": false,             // profiles.is_superadmin (gate global)
    "workspaces": {
      "<workspace_id>": {
        "role": "admin",             // workspace_members.role (ou role custom resolvida)
        "perms": [                   // permissões EFETIVAS resolvidas (granular + fallback)
          "integration.whatsapp.connection:view",
          "integration.whatsapp.account:edit",
          "integration.whatsapp.instance:manage"
        ]
      }
    }
  }
}
```

Regras do contrato:

- `perms` é a **lista efetiva já resolvida** (granular do banco quando
  `workspace_role_id` definido; senão a matriz hardcoded). O integrador faz só
  `perms.includes("integration.whatsapp.instance:manage")` — não re-resolve nada.
- Manter `perms` **compacto** (só chaves string). Se o token ficar grande,
  alternativa é mandar só `role` por workspace + os integradores aplicarem um
  mapa role→perms versionado embutido — mas o default é mandar `perms` resolvido.
- `superadmin` global, resolvido uma vez (substitui a leitura direta de
  `profiles.is_superadmin` que o backend WA faz hoje).
- Default-deny: ausência do claim, `v` desconhecido, workspace ausente → nega.

> Esse JSON é o ponto de acordo. Uma vez congelado, CRM e WA implementam em
> paralelo. Bump de `v` é mudança coordenada (documentar aqui).

## 4. Catálogo de permissões de integração (a semear)

Namespace channel-agnostic. Para o WhatsApp (espelha as rotas do backend WA —
ver `docs/frontend/wa-backend-integration-contracts.md`):

| Chave (`permissions.key`) | Descrição | Operação WA |
|---------------------------|-----------|-------------|
| `integration.whatsapp.connection:view` | Ver status/QR/listar instâncias | GET status, qrcode, list, get profile/privacy |
| `integration.whatsapp.instance:manage` | Provisionar/reiniciar/desconectar instância | POST create/restart/disconnect |
| `integration.whatsapp.account:edit` | Editar perfil/privacidade do número | PUT profile/*, privacy/* |

Canal futuro reusa o mesmo formato: `integration.instagram.account:manage`, etc.

Concessão às **system roles** (alinhada à matriz atual — `settings` é só
owner/admin; `manager` só `view`):

| Role | connection:view | account:edit | instance:manage |
|------|:---:|:---:|:---:|
| owner | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ |
| manager | ✓ | — | — |
| sales | — | — | — |
| support | — | — | — |

## 5. Checklist de implementação — lado CRM

### 5.1 Migration SQL (`supabase/migrations/<ts>_integration_permissions.sql`)

1. `INSERT INTO permissions (key, description, module, action)` as 3 chaves
   `integration.whatsapp.*` (e o que houver de outros canais). Sugestão:
   `module = 'integration.whatsapp'`, `action = 'connection:view'` etc., mantendo
   `key` no formato que o granular usa (`${module}:${action}` → revisar a
   montagem em `getWorkspaceContext`, hoje `permKeys.includes(\`${module}:${action}\`)`).
   > ⚠️ Decisão de gramática da chave: hoje `permissions.key` é `module:action`
   > com um único `:`. As chaves de integração têm dois (`integration.whatsapp.x:y`).
   > Confirmar que o `permKeys.includes(...)` continua correto (compara a chave
   > inteira, então funciona) e que nada faz `split(':')` assumindo 2 partes.
2. Atualizar `seed_workspace_system_roles(ws_id)` para conceder as novas chaves
   conforme a tabela §4.
3. Re-seed dos workspaces existentes (o bloco `DO $$ ... seed_workspace_system_roles` final da migration `20260427_rbac.sql` é o modelo).
4. Estender a matriz hardcoded `src/lib/permissions.ts` com as permissões de
   integração (para membros **sem** `workspace_role_id`, que caem no fallback).

### 5.2 Custom Access Token Hook

- Implementar o hook (Postgres function `SECURITY DEFINER` ou Edge Function) que,
  dado o `user_id`, monta o objeto `authz` do §3: lê `profiles.is_superadmin`,
  os `workspace_members` ativos do usuário, e para cada workspace resolve `perms`
  (granular via `workspace_role_permissions` quando `workspace_role_id`; senão a
  matriz). Reaproveitar a lógica de `getWorkspaceContext`.
- Registrar como **Custom Access Token Hook** no Supabase Auth (Dashboard →
  Authentication → Hooks, ou via config). Cuidado com performance: o hook roda
  em toda emissão/refresh.
- Versionar com `v: 1`.

### 5.3 Contrato + ADR no repo do CRM

- Criar `.sdds/contracts/authz-claims.md` com o §3 deste doc.
- Criar `.sdds/decisions/ADR-006-autorizacao-cross-service-claims-jwt.md`
  (status PROPOSTO → ACEITO quando validado).

### 5.4 Validação e2e

Gerar token de cada perfil e conferir o claim + o comportamento no backend WA:

- `sales` → `perms` sem `instance:manage` → `POST .../instances` deve dar **403**.
- `admin` → tem `instance:manage` → **200/201**.
- usuário de outro workspace → backend WA nega por **binding** (ver §6).
- `superadmin` → `authz.superadmin=true` → `/admin/tenants` **200**.

## 6. Invariantes anti-vazamento (valem para todo consumidor)

1. **Default-deny** — claim/versão/workspace ausente → nega.
2. **Binding recurso→workspace** — o integrador cruza o `workspace_id` do claim
   com a posse real do recurso. No WA: `wa_tenant_id → workspace_id` via
   `workspace_integrations` (`UNIQUE(wa_tenant_id)`, ADR-005 do CRM). Não basta
   "é membro do wa_tenant"; tem de ser **o workspace dono daquele wa_tenant**.
3. **Superadmin = um claim global**, nunca re-derivado por serviço.
4. **Staleness controlada** — revogação vale no próximo refresh do token; para
   mutações que exigem efeito imediato, prever endpoint de authz fresco (fase 2).

## 7. Faseamento e dependências de deploy

| # | Passo | Dono | Depende de |
|---|-------|------|-----------|
| 1 | Congelar o contrato do claim (§3) | conjunto | — |
| 2 | WA Fase 0 — gate por papel **local** (estanca a brecha) | Backend WA | nada — vai já |
| 3 | CRM — migration + hook + ativar no Supabase | **Frontend/CRM** | passo 1 |
| 4 | WA Fase 1 — ler o claim, binding, remover gate-ponte | Backend WA | passo 3 |

Crítico: **passo 3 antes do 4** — o token precisa já carregar o claim antes de o
WA depender dele. A Fase 1 do WA tem fallback para o gate local (passo 2)
enquanto houver tokens sem claim → transição **sem downtime**.

## 8. Divisão de trabalho

- **Backend WA (já em andamento):** Fase 0 (`.sdds/specs/wa-rbac-gate.md`) e
  Fase 1 (`app/core/authz.py` + binding). Não toca no repo do CRM.
- **Frontend/CRM (este handoff):** §5 inteira + a UI de Integrações consumindo
  os contratos de `docs/frontend/wa-backend-integration-contracts.md`.

Dúvidas de shape/contrato do lado WA: pedir aqui que eu exporto para `docs/`.
