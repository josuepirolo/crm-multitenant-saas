# RBAC — Controle de Acesso Baseado em Perfis por Workspace

## Modelo

Cada workspace tem seus próprios **perfis (roles)** com permissões configuráveis.  
Um usuário tem exatamente **1 perfil por workspace** (via `workspace_role_id` em `workspace_members`).

## Tabelas

| Tabela | Responsabilidade |
|---|---|
| `permissions` | Catálogo global de permissões (key: `module:action`) |
| `workspace_roles` | Perfis por workspace — system roles + customizadas |
| `workspace_role_permissions` | Mapeamento role → permissões |
| `workspace_members.workspace_role_id` | FK opcional para o perfil RBAC do membro |

## Fallback de compatibilidade

`workspace_role_id = NULL` → permissões derivadas da matriz hardcoded em `permissions.ts`.  
`workspace_role_id != NULL` → permissões vêm do banco (RBAC granular).

Isso garante zero quebra de dados existentes.

## System roles

Seedadas automaticamente em todo workspace novo via trigger.  
Não podem ser deletadas (`is_system = true`).

| Role | Permissões |
|---|---|
| owner | Todas |
| admin | Todas exceto settings:delete e members:delete |
| manager | leads/contacts/deals/chat/analytics + settings:view + members:view |
| sales | leads/contacts/deals/chat (VCE) + analytics:view |
| support | leads:view + contacts (VCE) + deals:view + chat:all |

## Roles customizadas

Owner e admin podem criar perfis customizados via `/settings`.  
Permissões são editáveis por perfil a qualquer momento.

## Auditoria

Toda alteração gera entrada em `audit_logs`:
- `role_created` — perfil criado
- `role_deleted` — perfil removido
- `role_permissions_set` — permissões atualizadas
- `member_rbac_assigned` — perfil atribuído ao membro

## Segurança

- Permissão **nunca** vem do cliente — sempre resolvida no servidor via `getWorkspaceContext()`
- RLS garante que usuários só veem roles do próprio workspace
- Apenas owner/admin podem criar/editar/deletar roles
- `service_role` nunca usado em fluxo de usuário comum
