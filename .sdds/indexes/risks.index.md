# Índice de Riscos

Atualizado: 2026-06-10

| ID | Risco | Nível | Status |
|---|---|---|---|
| R-001 | WA Integrations não implementada no frontend — tela /settings/integrations inexistente | ALTO | ABERTO |
| R-002 | Webhooks CRM sem validação HMAC — payload recebido sem verificação de assinatura | ALTO | ABERTO |
| R-003 | Supabase Vault não configurado — tokens de integração WA armazenados sem criptografia | MÉDIO | ABERTO |
| R-004 | Kanban sem testes automatizados (harness parcial) | MÉDIO | ABERTO |
| R-005 | Relatórios/Analytics incompletos — módulo parcial, sem relatórios reais | MÉDIO | ABERTO |
| R-006 | RLS ausente nas tabelas wa_* — gerenciada pelo backend WA externo | INFO | EXTERNO |
| R-007 | Nada detecta DDL ad-hoc em produção fora do framework de migrations | ALTO | ABERTO |
| R-008 | Fix de impersonação (acesso owner-like via `getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole`) | ALTO | RESOLVIDO 2026-06-09; complementado 2026-06-10 |
| R-009 | `createClient()` (RLS-bound) usado após resolver `workspaceId` impersonado em ~15 arquivos fora de `contacts/` — RLS bloqueia leitura/escrita durante impersonação | ALTO | ABERTO |
