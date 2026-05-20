# CURRENT_STATE.md

SDDS_VERSION: 1.3.2
Atualizado: 2026-05-20
Bootstrap: recuperado de código real (sessão anterior sem persistência de .sdds/)

---

## Estado dos módulos

| Módulo | Status | Observação |
|---|---|---|
| Auth | IMPLEMENTADO | login, register, MFA, reset, Turnstile, session policy |
| Contacts | IMPLEMENTADO | CRUD, filtros, paginação, multi-tenant, soft delete |
| Kanban | IMPLEMENTADO | Board DnD (@dnd-kit), CRUD de deals, pipeline, otimista |
| Settings | IMPLEMENTADO | workspace, membros, RBAC, MFA, nicho, upload |
| Admin | IMPLEMENTADO | superadmin, workspaces, impersonation, analytics, nichos |
| Dashboard | IMPLEMENTADO | stats, gráficos (sem openConversations) |
| Analytics | PARCIAL | tracking de área implementado, relatórios incompletos |
| Auto Parts | IMPLEMENTADO | catálogo, precificação, cotações |
| Auto Sales | IMPLEMENTADO | inventário, propostas, veículos |
| Fashion | IMPLEMENTADO | produtos, variantes, estoque |
| Chat/Inbox | REMOVIDO | conversations/messages dropadas — WA API é fonte de verdade |
| WA Integrations | PENDENTE | workspace_integrations existe, tela /settings/integrations a criar |

## Riscos atuais

| ID | Risco | Nível | Status |
|---|---|---|---|
| R-001 | Integração WA não implementada no frontend | ALTO | ABERTO |
| R-002 | Webhooks CRM sem HMAC | ALTO | ABERTO |
| R-003 | Supabase Vault não configurado (tokens de integração) | MÉDIO | ABERTO |
| R-004 | 2FA não obrigatório para todos os admins | MÉDIO | ACEITO |
| R-005 | Kanban sem testes automatizados (harness parcial) | MÉDIO | ABERTO |
| R-006 | RLS ausente nas tabelas wa_* (gerenciada pelo WA backend) | INFO | EXTERNO |

## Verdades atuais (CONFIRMADO)

- RLS ativo em todas as tabelas CRM
- workspace_id nunca do cliente — sempre do contexto autenticado
- service_role isolado de fluxos de usuário
- Kanban: @dnd-kit instalado, DnD otimista com rollback implementado
- conversations/messages: REMOVIDAS — WA API é fonte de verdade
- WA backend: 27 tabelas wa_* provisionadas no mesmo Supabase
- workspace_integrations: ponte CRM ↔ WA API via wa_tenant_id
- Repositório GitHub: josuepirolo/crm-multitenant-saas (privado, dev/prod)

## Próximas ações disponíveis

| Ação | Módulo SDDS | Status |
|---|---|---|
| Spec módulo WA Integrations | 02_CREATE_MODULE_SPEC | PRÓXIMO |
| Tela /settings/integrations | 06_IMPLEMENTATION | Aguarda spec |
| Linkar deal → wa_conversation | 06_IMPLEMENTATION | Aguarda spec |
| Auditar Kanban implementado | 04_AUDITOR | Disponível |
