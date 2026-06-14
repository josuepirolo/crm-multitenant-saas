# ADR-006 — CRM consome o backend WA como BFF (gestão de instância), repassando o JWT do usuário

## Data
2026-06-13

## Status
ACEITO (design) — implementação gated por dois insumos externos (ver "Pendências bloqueantes")

## Contexto

A tela `/settings/integrations` (ver `specs/settings-integrations.spec.md`, R-001) foi
especificada na v1 como **somente-leitura via RLS** sobre `workspace_integrations` — porque
`wa_tenants`/`wa_instances` não são legíveis por membros comuns via RLS (só o `service_role`
do admin as lê hoje). Isso entrega "quais instâncias estão vinculadas", mas **não** entrega o
que o cliente final realmente quer: **"meu WhatsApp está conectado?"**, QR Code de pareamento,
status real, e edição de perfil/privacidade da conta.

O documento `backend_zapi/frontend-whatsapp-integration.md` (contrato de administração do backend
WhatsApp, FastAPI + Z-API) revela um caminho que a v1 não previu: o backend WA expõe uma **API REST
própria** autenticada por `Authorization: Bearer <JWT Supabase>` (`require_auth`), onde o `sub` do
JWT é o `id` em `wa_tenant_members.user_id` / `wa_tenant_users.id`. Ou seja, o CRM pode obter, do
backend WA, os dados de `wa_*` que a RLS do Supabase bloqueia — **sem** dar `SELECT` direto nessas
tabelas ao membro.

Endpoints relevantes (todos `require_auth`, gate atual = membro ativo de `wa_tenant_members`,
**qualquer role**):
- `GET /management/tenants/{tenant_id}/instances` — lista instâncias do tenant
- `GET /management/instances/{instance_id}/status` — status de conexão na Z-API
- `GET /management/instances/{instance_id}/qrcode` — QR de pareamento (409 se já conectado)
- `POST /management/instances/{instance_id}/restart` — reinicia
- `POST /management/instances/{instance_id}/disconnect` — desconecta
- `GET|PUT /tenants/{tenant_id}/instances/{instance_id}/profile[...]` — perfil da conta
- `GET|PUT /tenants/{tenant_id}/instances/{instance_id}/privacy[...]` — 8 controles de privacidade

## Decisão

1. **Padrão BFF (Backend-for-Frontend).** O CRM **nunca** chama o backend WA a partir do client
   (browser). Toda chamada passa por uma **Server Action / Route Handler** do CRM, que injeta o
   JWT server-side. O browser fala só com o CRM; o CRM fala com o backend WA. Preserva [[ADR-001]]
   (frontend agnóstico ao provider) e mantém a base URL e a forma de auth fora do bundle.

2. **Auth por repasse do JWT do próprio usuário.** A Server Action obtém o `access_token` da
   sessão Supabase do usuário autenticado (server-side, via `supabase.auth.getSession()`) e o envia
   como `Authorization: Bearer <token>` ao backend WA. **Não** se cria secret novo, nem se usa
   `service_role`, nem token de serviço compartilhado. Consequência de segurança desejável: a
   **autorização final é do backend WA** (`wa_tenant_members`), não duplicada/forjável no CRM.

3. **Base URL via env server-only.** Nova variável `WA_BACKEND_URL` (sem prefixo `NEXT_PUBLIC_` —
   nunca exposta ao client). Ausência da variável = feature desligada com erro genérico (degrada,
   não quebra).

4. **`wa_tenant_id` derivado do servidor, nunca do client.** A Server Action resolve quais
   `wa_tenant_id` pertencem ao `workspace` autenticado lendo `workspace_integrations`
   (`getWorkspaceContext` → `workspace_id` do contexto; `getScopedSupabaseClient`, R-009). O client
   nunca informa `tenant_id`/`instance_id` arbitrário: a action valida que o `instance_id` pedido
   pertence a um `wa_tenant_id` vinculado ao workspace do usuário antes de repassar (defesa em
   profundidade contra IDOR, somada ao gate do backend WA).

5. **Gate de role no CRM por cima do gate do backend.** O backend WA hoje libera **qualquer**
   `wa_tenant_members` ativo (qualquer role) para operar instância e editar privacidade. Isso é
   mais permissivo que o desejável para um SaaS. O CRM aplica seu próprio RBAC antes de repassar:
   - **Leitura** (listar instâncias, status, QR) → exige `settings:view`.
   - **Mutação** (restart, disconnect, editar perfil/privacidade) → exige `settings:edit`.
   Como não existe `PermissionModule` "integrations" (o enum é fixo: leads/contacts/deals/chat/
   analytics/settings/members), reusa-se o módulo **`settings`**. Introduzir um módulo
   "integrations" dedicado fica como evolução futura (mexe em `types`, matriz `permissions.ts` e
   RBAC no banco) — registrar como addendum se adotado.

6. **Tradução de erros, sem vazar interno.** Respostas não-2xx do backend WA são mapeadas para
   erros genéricos do CRM (`publicError`): `401/403` → "Sua conta não tem acesso a esta instância
   WhatsApp — fale com o suporte."; `409` no QR → "Número já conectado."; `5xx`/timeout → "Serviço
   de WhatsApp indisponível, tente novamente.". **Nunca** repassar corpo de erro bruto, stack, nem
   token. Timeout obrigatório (AbortController) — o CRM não pode pendurar numa chamada lenta do
   provider.

7. **Sem logar segredos.** O `access_token`, QR (base64) e qualquer `credentials` nunca vão a log.
   Auditoria de **mutação** (restart/disconnect/edição de perfil-privacidade) via
   `createAuditLog` com `source: "user"`, registrando ação + `entity_id` (instância) + workspace +
   user, **sem** payload sensível.

## Gap conhecido — membership CRM ≠ membership WA

Ser membro do `workspace` CRM **não implica** ser `wa_tenant_members` no backend WA: a identidade é
a mesma (`auth.uid()`), mas a linha em `wa_tenant_members` é provisionada à parte (passo 2 do
onboarding adiciona apenas o **1º** membro como `owner`). Logo, um vendedor do workspace pode
receber **403 do backend WA** mesmo passando pelo RBAC do CRM. O BFF trata isso como erro amigável
(decisão 6). Fechar esse gap de provisionamento (sincronizar `workspace_members` ↔
`wa_tenant_members`) é trabalho futuro do backend WA — fora do escopo do CRM.

## Pendências bloqueantes (antes de tipar o client e a UI)

- **`WA_BACKEND_URL`** — host real do backend WA (deploy). Só o operador tem.
- **Contratos de request/response** dos endpoints de management/account-settings
  (`.sdds/contracts/management-instances.md`, `account-settings.md` no **repositório do backend**).
  Sem os schemas exatos de `/status` e `/qrcode`, tipar as respostas seria adivinhar JSON. A infra
  **contract-independent** (client HTTP que repassa o JWT, base URL por env, timeout, mapeamento de
  erro) pode e deve ser construída antes; os **métodos tipados + UI** aguardam os contratos.

## Consequências

**Positivas:**
- Destrava status real / QR / perfil sem dar `SELECT` em `wa_*` ao membro (RLS intacta).
- Nenhum secret novo; autorização final no backend WA (fonte de verdade, [[ADR-001]]).
- Client nunca toca o backend WA direto → base URL e auth fora do bundle.
- RBAC do CRM restringe por cima do gate permissivo do backend.

**Negativas:**
- Acopla o CRM à disponibilidade do backend WA (mitigado por timeout + degradação + erro amigável).
- Depende de contratos versionados em outro repo — drift de contrato precisa de disciplina.
- `wa_tenant_members` desalinhado de `workspace_members` gera 403 legítimo confuso até o gap ser
  fechado no backend.

## Arquivos relacionados (previstos)
- `.env.example` / `.env.local` — `WA_BACKEND_URL` (server-only)
- `src/lib/wa-backend/client.ts` — client HTTP genérico (repassa JWT, base URL env, timeout, erro)
- `src/repositories/wa-management.repository.ts` — métodos tipados por endpoint (após contratos)
- `src/usecases/WaManagementUseCases.ts`
- `src/app/(dashboard)/settings/integrations-actions.ts` — Server Actions BFF (gate `settings`)
- `src/viewmodels/useSettingsIntegrationsViewModel.ts`
- `src/components/settings/integrations/*`
- `specs/settings-integrations.spec.md` (v2) · `harness/settings-integrations.harness.md`
- `decisions/ADR-001-whatsapp-architecture.md` · `decisions/ADR-005-admin-wa-tenant-mapping.md`
