# CURRENT_STATE.md

SDDS_VERSION: 1.3.1  
Atualizado: 2026-05-13  
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
| Dashboard | IMPLEMENTADO | stats, gráficos, realtime-ready |
| Analytics | PARCIAL | tracking de área implementado, relatórios incompletos |
| Auto Parts | IMPLEMENTADO | catálogo, precificação, cotações |
| Auto Sales | IMPLEMENTADO | inventário, propostas, veículos |
| Fashion | IMPLEMENTADO | produtos, variantes, estoque |
| Chat/Inbox | SPEC | spec/contract/harness criados — pronto para 06_IMPLEMENTATION |

## Riscos atuais

| ID | Risco | Nível | Status |
|---|---|---|---|
| R-001 | Z-API não integrado — Chat real bloqueado | ALTO | ABERTO |
| R-002 | Webhooks WhatsApp sem HMAC | ALTO | ABERTO |
| R-003 | Supabase Vault não configurado (tokens de integração) | MÉDIO | ABERTO |
| R-004 | 2FA não obrigatório para todos os admins | MÉDIO | ACEITO |
| R-005 | Kanban sem testes automatizados (harness parcial) | MÉDIO | ABERTO |

## Verdades atuais (CONFIRMADO)

- RLS ativo em todas as tabelas
- workspace_id nunca do cliente — sempre do contexto autenticado
- service_role isolado de fluxos de usuário
- Kanban: @dnd-kit instalado, DnD otimista com rollback implementado
- Chat: página placeholder, schema de conversas/mensagens existe no banco
- Z-API: pendente — sem integração, sem tokens, sem webhooks

## Próximas ações disponíveis

| Ação | Módulo SDDS | Status |
|---|---|---|
| Implementar Chat/Inbox (UI shell) | 06_IMPLEMENTATION | **PRONTO** — spec existe |
| Resolver CC-01 a CC-04 (pendências chat) | 03_RESOLVE_PENDING | Não bloqueia 06 (apenas CC-02 relevante) |
| Auditar Kanban implementado | 04_AUDITOR | Disponível |
