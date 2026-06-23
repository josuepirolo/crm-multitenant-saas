# Índice de Riscos

Atualizado: 2026-06-23

| ID | Risco | Nível | Status |
|---|---|---|---|
| R-001 | WA Integrations não implementada no frontend | ALTO | RESOLVIDO (console ADR-008 fases 1-4) — pendente validação manual |
| R-002 | Webhooks CRM sem validação HMAC | ALTO | ABERTO |
| R-003 | Supabase Vault não configurado | MÉDIO | ABERTO |
| R-004 | 2FA não obrigatório para todos os admins | MÉDIO | ACEITO |
| R-005 | Kanban sem testes automatizados (harness parcial) | MÉDIO | ABERTO |
| R-006 | RLS ausente nas tabelas wa_* | INFO | **DESATUALIZADO** — maioria tem RLS; ver R-010 para gaps reais |
| R-007 | DDL ad-hoc em produção sem rastro | ALTO | MITIGADO 2026-06-12 (`ddl_audit_log` + event triggers) |
| R-008 | Impersonação não isolava workspace_id | ALTO | RESOLVIDO 2026-06-09 |
| R-009 | `createClient()` RLS-bound durante impersonação | ALTO | RESOLVIDO 2026-06-10 |
| R-010 | 4 tabelas `wa_*` sem RLS (`wa_campaigns`, `wa_campaign_recipients`, `wa_media_public_links`, `wa_send_origins`) | CRÍTICO | ABERTO — SQL pronto, não aplicado. Ver `discoveries/2026-06-17-wa-rls-gaps-and-tenant-limit1.md` |
| R-011 | `get_my_tenant_id()` LIMIT 1 sem workspace ativo (multi-workspace) | ALTO | ABERTO — recado ao backend pendente |
