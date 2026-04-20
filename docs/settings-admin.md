# Módulo: Settings + Admin Panel

## O que foi implementado

### Parte 1 — Configurações do Workspace (`/settings`)

Cada usuário com role `owner` ou `admin` pode gerenciar o próprio workspace.

**Abas disponíveis:**

| Aba | Acesso mínimo | O que faz |
|---|---|---|
| Geral | `settings.view` | Ver nome e slug do workspace |
| Geral (editar) | `settings.edit` | Alterar nome do workspace |
| Membros | `members.view` | Ver lista de membros ativos |
| Membros (gerenciar) | `members.create` | Convidar, alterar role, remover |

**Regras de negócio:**
- Owner não pode alterar a própria role
- Owner não pode ser removido do workspace
- Usuário não pode alterar a própria role nem se desativar
- Funções atribuíveis: `admin`, `manager`, `sales`, `support` (nunca `owner`)
- Invite só funciona para usuários já cadastrados no sistema

---

### Parte 2 — Painel Super-Admin (`/admin`)

Acessível apenas ao usuário com `profiles.is_superadmin = true`. Qualquer outro usuário recebe 404.

**Funcionalidades:**

| Feature | Descrição |
|---|---|
| Cards globais | Total workspaces, membros, contatos, deals |
| Tabela de workspaces | Lista paginada (20/página) com busca por nome |
| Detalhes do workspace | Painel lateral com stats + lista de membros |

---

## Arquitetura implementada

```
Camada          Arquivo
─────────────────────────────────────────────────────────
Types           src/types/index.ts
                  + WorkspaceMemberWithProfile
                  + WorkspaceWithStats
                  + AdminGlobalStats
                  + Profile.is_superadmin, Profile.email

Validações      src/lib/validations/workspace.ts
                  updateWorkspaceSchema
                  inviteMemberSchema
                  updateMemberRoleSchema

Repositories    src/repositories/workspace.repository.ts  (+ update)
                src/repositories/member.repository.ts     (tipo corrigido)
                src/repositories/admin.repository.ts      (novo)

UseCases        src/usecases/WorkspaceUseCases.ts
                src/usecases/MemberUseCases.ts
                src/usecases/AdminUseCases.ts

Guards          src/lib/guards.ts  (+ requireSuperAdmin)

Actions         src/app/(dashboard)/settings/actions.ts
                src/app/(admin)/admin/actions.ts

ViewModels      src/viewmodels/useSettingsViewModel.ts
                src/viewmodels/useAdminViewModel.ts

Components      src/components/settings/
                  workspace-general-form.tsx
                  members-table.tsx
                  invite-member-modal.tsx
                  settings-tabs.tsx
                src/components/admin/
                  admin-sidebar.tsx
                  admin-stats-cards.tsx
                  workspaces-table.tsx
                  workspace-detail-panel.tsx

Pages           src/app/(dashboard)/settings/page.tsx
                src/app/(dashboard)/settings/settings-client.tsx
                src/app/(admin)/layout.tsx
                src/app/(admin)/admin/page.tsx
                src/app/(admin)/admin/admin-client.tsx
```

---

## Como ativar o Super-Admin

1. Aplique a migration: `supabase/migrations/20260419_settings_admin.sql`
2. Obtenha seu `user_id` no Supabase Dashboard → Authentication → Users
3. Execute no SQL Editor do Supabase:
   ```sql
   UPDATE profiles SET is_superadmin = true WHERE id = 'SEU-USER-ID';
   ```
4. Acesse `/admin`

---

## Como funciona o convite de membros

1. Admin acessa `/settings` → aba Membros → "Convidar"
2. Informa e-mail + role
3. O sistema busca o user_id via `get_user_id_by_email()` (função SQL SECURITY DEFINER)
4. Se encontrado: adiciona diretamente ao `workspace_members`
5. Se não encontrado: erro "O usuário precisa criar uma conta primeiro"

**Limitação V1:** Apenas usuários já cadastrados podem ser convidados. Invite por e-mail para novos usuários é escopo futuro.

---

## Segurança

| Ponto | Como é garantido |
|---|---|
| Acesso ao `/admin` | `requireSuperAdmin()` no layout server-side → `notFound()` |
| `is_superadmin` não alterável pelo usuário | RLS `RESTRICTIVE` policy na tabela `profiles` |
| `get_user_id_by_email` | `REVOKE PUBLIC`, `GRANT service_role` apenas |
| Actions de settings | `getWorkspaceContext()` verifica role antes de operar |
| Admin actions | `requireSuperAdmin()` no início de cada action |
| Todas queries do admin | `service_role` client (bypassa RLS, cross-workspace) |
| Queries do settings | `service_role` client com filtro por `workspace_id` do contexto autenticado |

---

## Performance

| Operação | Estratégia |
|---|---|
| Carregar settings | `Promise.all` (workspace + members em paralelo) |
| Update do workspace | Otimista no ViewModel (`setWorkspace`) |
| Role change | Otimista (`setMembers`) + background refetch via `startTransition` |
| Deactivate | Otimista (`filter` do array) + background refetch |
| Convite | `toast.promise`, fecha modal imediatamente ao sucesso |
| Admin stats | `Promise.all` de 4 queries no banco |
| Workspace list | Paginada (20/página), busca com debounce 300ms |
| Counts por workspace | `Promise.all` de 3 queries para os IDs da página atual |
| Detalhe do workspace | Lazy: carrega membros só ao clicar na linha |
