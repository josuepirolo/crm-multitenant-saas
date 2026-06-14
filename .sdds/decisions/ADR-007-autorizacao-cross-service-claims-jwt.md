# ADR-007 — Autorização cross-service via claim `authz` no JWT (CRM dono do RBAC)

## Data
2026-06-13

## Status
ACEITO (passo 3 do CRM implementado: migration + hook + seed; ativação do hook pendente no Auth)

## Contexto
O bearer token é um JWT Supabase **compartilhado** por todos os serviços (CRM + backends
integradores: WhatsApp hoje, Instagram/outros amanhã), mas carrega só identidade (`sub`).
Hoje cada backend re-deriva autorização sozinho — e o backend WA chegou a abrir o precedente
de **ler `profiles` direto** no banco do CRM. Generalizar isso (N integradores × M tabelas
internas) acopla tudo, reimplementa autorização multi-tenant em vários lugares e vira fonte de
drift e vazamento entre workspaces.

Handoff de origem (lado WA): `backend_zapi/frontend/authz-architecture-and-crm-handoff.md`
(par do ADR-008 no repo do backend). Numeração no CRM: **ADR-007** (ADR-006 já é o BFF).

## Decisão
**O CRM é o único dono do modelo de autorização. Os integradores nunca leem tabelas do CRM —
consomem o resultado já resolvido, transportado num claim assinado dentro do JWT Supabase.**

1. **Catálogo channel-agnostic** — 3 permissões `integration.whatsapp.*` entram no catálogo
   `permissions` existente (migration `20260613190000`): `connection:view`, `instance:manage`,
   `account:edit`. Namespace futuro reusa `integration.{canal}.{recurso}:{ação}`.
2. **Custom Access Token Hook** (`public.custom_access_token_hook`) resolve o RBAC e injeta o
   claim `authz` (namespace `https://lekazis.app/authz`) no access token, uma vez por emissão.
3. **Contrato versionado** (`v: 1`) — `.sdds/contracts/authz-claims.md`, CONGELADO. Única
   superfície que os integradores conhecem; mudar formato = bump de `v` coordenado.

## Decisões de implementação (e desvios conscientes do checklist §5)

- **Gramática da chave (decisão bloqueante) — RESOLVIDA:** chaves com dois `:`
  (`integration.whatsapp.instance:manage`) são seguras. `grep '.split(":")'` em `src/` = 0; o
  granular compara a chave inteira (`permKeys.includes(\`${module}:${action}\`)`). `module =
  'integration.whatsapp'`, `action = 'connection:view'` etc. reconstroem exatamente a `key`.
- **`perms` filtrado a `integration.*`:** o hook carimba só as chaves de integração (não todas as
  do workspace). Os integradores só consomem essas → token compacto, endereçando proativamente a
  preocupação de tamanho do §3 sem precisar do plano B. **Formato do claim inalterado** — só o
  conteúdo de `perms`. Comunicado ao time WA.
- **Resolução de `perms` pela system role do banco, não pela matriz TS:** para membros sem
  `workspace_role_id`, o hook resolve via a system role homônima (`workspace_roles.name = role`),
  que é semeada por `seed_workspace_system_roles` espelhando `permissions.ts`. Evita duplicar a
  matriz em SQL e contorna o conflito de tipos do TS (as ações de integração — `connection:view`,
  `instance:manage` — **não cabem** no enum `PermissionAction = view|create|edit|delete`).
- **`src/lib/permissions.ts` NÃO foi estendido** (desvio do §5.1.4): a matriz TS é tipada para
  `module:action` com ação no enum de 4 valores; as chaves de integração não encaixam sem quebrar
  o tipo. Como (a) o hook resolve `perms` pelo banco e (b) a UI do CRM gateia integrações por
  `settings` (ver [[ADR-006]]), a matriz TS não precisa das chaves de integração. Se algum código
  futuro do CRM precisar checar `integration.*` via `can()`, criar uma estrutura separada então.
- **Hook EXCEPTION-SAFE:** `EXCEPTION WHEN OTHERS THEN RETURN event` — qualquer falha devolve o
  token intacto, nunca bloqueia login (integradores caem em default-deny, que é seguro). É a
  salvaguarda contra a classe de incidente do `business_niches` (2026-06-08): um hook que roda em
  toda emissão de token jamais pode derrubar o login. `SECURITY DEFINER` + `SET search_path`,
  `STABLE`, `GRANT EXECUTE` só a `supabase_auth_admin`.

## Faseamento (sem downtime)
| # | Passo | Dono | Estado |
|---|---|---|---|
| 1 | Congelar contrato do claim (§3) | conjunto | ✅ feito |
| 2 | WA Fase 0 — gate por papel local (estanca brecha) | Backend WA | ✅ no ar (fallback) |
| 3 | **CRM — migration + hook + seed** | **CRM** | ✅ migration pronta; **ativar hook no Auth pendente** |
| 4 | WA Fase 1 — ler o claim + binding | Backend WA | aguarda passo 3 ativo |

Crítico: **passo 3 ativo antes do 4**. A Fase 1 do WA tem fallback ao gate local enquanto houver
tokens sem claim → transição sem downtime.

## Ativação (passo manual, consciente)
A migration cria a função inerte. Para o claim começar a ser emitido:
1. Supabase Dashboard → Authentication → Hooks → **Custom Access Token** → selecionar
   `public.custom_access_token_hook` e habilitar. (Local: já em `supabase/config.toml`.)
2. Validação e2e (§5.4): `sales` → `perms` sem `instance:manage`; `admin` → tem; `superadmin` →
   `authz.superadmin=true`; usuário de outro workspace → negado por binding no WA.

## Consequências
**Positivas:** autorização centralizada no CRM; integradores stateless e desacoplados das tabelas
do CRM; novos canais reusam o formato; token compacto.
**Negativas:** hook roda em toda emissão (custo + risco — mitigado por exception-safe + STABLE +
índices); staleness até o próximo refresh; sincronização manual entre seed DB e `permissions.ts`.

## Arquivos relacionados
- `supabase/migrations/20260613190000_integration_permissions_and_authz_hook.sql`
- `supabase/config.toml` (`[auth.hook.custom_access_token]`)
- `.sdds/contracts/authz-claims.md` (claim CONGELADO v1)
- `backend_zapi/frontend/authz-architecture-and-crm-handoff.md` (handoff de origem)
- `decisions/ADR-005-admin-wa-tenant-mapping.md` (binding `wa_tenant_id → workspace_id`)
- `decisions/ADR-006-bff-wa-backend-management.md` (UI de integrações; gate por `settings`)
