# ADR-005 — Mapeamento N:1 entre `wa_tenant_id` (backend WA) e `workspace_id` (CRM), gerido via /admin

## Data
2026-06-11

## Status
ACEITO

## Contexto
`workspace_integrations` é a ponte entre o CRM (`workspace_id`) e o backend WhatsApp (`wa_tenant_id` → `wa_tenants` → `wa_instances`), conforme `decisions/ADR-001-whatsapp-architecture.md` e `discoveries/2026-05-20-wa-backend-architecture.md`.

A constraint original `UNIQUE (workspace_id, integration_type, provider_id)` (migration `20260520000001_workspace_integrations.sql`) limitava cada workspace a **no máximo 1 vínculo por (workspace, tipo, provider)** — impedindo, por exemplo, que um mesmo workspace tivesse duas instâncias WA via Z-API (ex.: número "Vendas" e número "Suporte"). Além disso, não existia nenhuma UI para gerenciar esses vínculos.

## Decisão
1. **Modelo 1 workspace : N `wa_tenant_id`** — um workspace CRM pode ter múltiplas instâncias WhatsApp vinculadas (uma linha em `workspace_integrations` por instância). A constraint antiga foi removida (migration `20260611000000_workspace_integrations_multi_instance.sql`).
2. **Inverso 1:1 obrigatório** — nova constraint `UNIQUE (wa_tenant_id)` garante que cada `wa_tenant_id` pertence a **no máximo 1 workspace**. Sem essa regra, dois CRMs distintos poderiam ler dados da mesma conta WhatsApp, quebrando o isolamento multi-tenant. Postgres trata múltiplos `NULL` como distintos, então linhas futuras com `wa_tenant_id = NULL` (ex.: vínculo "pendente" sem instância ainda escolhida) continuam permitidas em qualquer quantidade.
3. **Coluna `label`** — nome amigável opcional por instância vinculada (ex.: "Vendas SP", "Suporte"), exibido na UI do admin.
4. **Gestão exclusiva via `/admin` (superadmin)** — `src/app/(admin)/admin/integrations-actions.ts` expõe `listWorkspaceIntegrationsAdmin`, `listAvailableWaTenantsAdmin`, `listWaProvidersAdmin`, `linkWaTenantAdmin`, `updateWorkspaceIntegrationAdmin`, `unlinkWaTenantAdmin` — todas atrás de `requireSuperAdmin()`, usando `createAdminClient()` (service_role), com auditoria via `AUDIT_ACTIONS.INTEGRATION_LINKED/UPDATED/UNLINKED`.
5. **Leitura cross-domain somente leitura** — `SupabaseWorkspaceIntegrationRepository` (`src/repositories/workspace-integration.repository.ts`) faz `SELECT` em `wa_tenants`, `wa_instances` e `wa_providers` para exibir nome/slug/contagem de instâncias e providers disponíveis, mas **nunca** insere/atualiza/remove nessas tabelas — reforça ADR-001 (CRM não escreve em `wa_*`). Campos sensíveis (`provider_credentials`, `credentials`, `webhook_secret`) nunca são lidos nem logados.

## UI
`src/components/admin/workspace-integrations-section.tsx` — seção em accordion no painel de detalhe do workspace (`WorkspaceDetailPanel`), após "Dados cadastrais": lista vínculos existentes (label, status, provider, contagem de instâncias, editar, remover) e formulário inline para vincular uma instância `wa_tenant` ainda não associada a nenhum workspace.

## Consequências

**Positivas:**
- Suporta o caso real de um cliente ter múltiplos números/instâncias WhatsApp.
- Isolamento multi-tenant entre CRM e backend WA preservado pela constraint inversa.
- Nenhuma escrita em `wa_*` a partir do CRM — superfície de risco não aumenta.

**Negativas:**
- Se um `wa_tenant_id` precisar ser remapeado para outro workspace, é preciso primeiro remover o vínculo antigo (a constraint `UNIQUE (wa_tenant_id)` rejeita o INSERT direto no novo workspace enquanto o vínculo antigo existir).

## Arquivos relacionados
- `supabase/migrations/20260611000000_workspace_integrations_multi_instance.sql`
- `src/types/index.ts` (`WorkspaceIntegration`, `WorkspaceIntegrationWithWaTenant`, `WaTenantOption`, `WaProviderOption`, `IntegrationStatus`)
- `src/repositories/workspace-integration.repository.ts`
- `src/usecases/WorkspaceIntegrationUseCases.ts`
- `src/lib/validations/workspace-integration.ts`
- `src/app/(admin)/admin/integrations-actions.ts`
- `src/viewmodels/useWorkspaceIntegrationsViewModel.ts`
- `src/components/admin/workspace-integrations-section.tsx`
- `decisions/ADR-001-whatsapp-architecture.md`
