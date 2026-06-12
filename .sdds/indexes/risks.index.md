# Índice de Riscos

Atualizado: 2026-06-12

| ID | Risco | Nível | Status |
|---|---|---|---|
| R-001 | WA Integrations não implementada no frontend — tela /settings/integrations inexistente | ALTO | PARCIAL — gestão admin (1 workspace : N `wa_tenant_id`) implementada 2026-06-11 (ADR-005); falta tela `/settings/integrations` para o usuário final |
| R-002 | Webhooks CRM sem validação HMAC — payload recebido sem verificação de assinatura | ALTO | ABERTO |
| R-003 | Supabase Vault não configurado — tokens de integração WA armazenados sem criptografia | MÉDIO | ABERTO |
| R-004 | Kanban sem testes automatizados (harness parcial) | MÉDIO | ABERTO |
| R-005 | Relatórios/Analytics incompletos — módulo parcial, sem relatórios reais | MÉDIO | ABERTO |
| R-006 | RLS ausente nas tabelas wa_* — gerenciada pelo backend WA externo | INFO | EXTERNO |
| R-007 | Nada detecta DDL ad-hoc em produção fora do framework de migrations | ALTO | MITIGADO 2026-06-12 — `ddl_audit_log` + event triggers (`ddl_command_end`/`sql_drop`) registram todo DDL com role/data/comando (migration `20260612090000`); pendente: drift check periódico (`supabase db diff` em CI) |
| R-008 | Fix de impersonação (acesso owner-like via `getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole`) | ALTO | RESOLVIDO 2026-06-09; complementado 2026-06-10 |
| R-009 | `createClient()` (RLS-bound) usado após resolver `workspaceId` impersonado em ~15 arquivos fora de `contacts/` — RLS bloqueia leitura/escrita durante impersonação | ALTO | RESOLVIDO 2026-06-10 |
