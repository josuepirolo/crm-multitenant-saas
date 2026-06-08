# CURRENT_STATE.md

SDDS_VERSION: 1.3.2
Atualizado: 2026-05-20
Bootstrap: recuperado de código real (sessão anterior sem persistência de .sdds/)

---

## Estado dos módulos

| Módulo | Status | Observação |
|---|---|---|
| Auth | IMPLEMENTADO | login, register (auto-cadastro DESATIVADO via flag, código preservado), MFA, reset, Turnstile, session policy |
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
| R-007 | Nada detecta DDL ad-hoc em produção fora do framework de migrations | ALTO | ABERTO |

## Verdades atuais (CONFIRMADO)

- RLS ativo em todas as tabelas CRM
- workspace_id nunca do cliente — sempre do contexto autenticado
- service_role isolado de fluxos de usuário
- Kanban: @dnd-kit instalado, DnD otimista com rollback implementado
- conversations/messages: REMOVIDAS — WA API é fonte de verdade
- WA backend: 27 tabelas wa_* provisionadas no mesmo Supabase
- workspace_integrations: ponte CRM ↔ WA API via wa_tenant_id
- Repositório GitHub: josuepirolo/crm-multitenant-saas (privado, dev/prod)
- Auto-cadastro (`/register`) DESATIVADO via `SELF_REGISTRATION_ENABLED` em `src/lib/constants/feature-flags.ts` (decisão de produto, 2026-06-07) — página/form preservados, reverter trocando a flag para `true`
- Captcha Turnstile: verificação acontece SOMENTE no Supabase Auth (GoTrue) via `captchaToken`; módulo próprio `src/lib/security/turnstile.ts` foi removido por causar dupla verificação (token single-use) — erro `captcha protection: request disallowed (timeout-or-duplicate)` corrigido em 2026-06-07
- `updatePassword` (reset de senha): causa raiz era GoTrue exigir sessão **AAL2** para alterar senha quando o usuário tem MFA/TOTP ativo (sessão de recovery por e-mail é só AAL1) — erro `"AAL2 session is required to update email or password when MFA is enabled"` ficava mascarado por "link pode ter expirado". Corrigido elevando a sessão via `mfa.challenge`+`mfa.verify` dentro da própria Server Action (campo de código 2FA condicional, calculado no servidor via `listFactors`, nunca confiando no client); adicionados também `console.error` de diagnóstico e `SAME_PASSWORD_ERROR`/`isSamePasswordError` em `security-errors.ts` para o caso de nova senha igual à atual — corrigido em 2026-06-07
- **INCIDENTE GRAVE (outage site-wide) — RESOLVIDO 2026-06-08**: a tabela `business_niches` foi **dropada da produção via SQL ad-hoc fora do framework de migrations** (zero rastro em `supabase_migrations.schema_migrations`, embora 3 migrations posteriores a referenciassem com sucesso — prova de que existiu até pelo menos 2026-05-04). Toda chamada a `getActiveWorkspaceContext` (usada no login de TODOS os usuários) executava `workspaces.select(..., business_niches(slug))`, que falhava com `PGRST200` ("relationship not found in schema cache") e retornava `workspaces: []`, redirecionando geral para `/no-workspace`. Causa raiz só foi visível após adicionar `console.error` de diagnóstico em `getActiveWorkspaceContext` (mesmo padrão que já tinha revelado os bugs de captcha e AAL2 — mantido permanentemente). Corrigido com `supabase/migrations/20260608120000_restore_business_niches.sql` (recria tabela+RLS+índices+trigger+FK+seed completo de 27 nichos, zera `business_niche_id` órfão do workspace PyTec). **Lição estrutural**: nunca executar DDL solto/SQL editor direto em produção — sempre via migration versionada; considerar auditoria periódica `list_migrations` vs `information_schema.tables` para detectar drift (ver risco R-007)

## Próximas ações disponíveis

| Ação | Módulo SDDS | Status |
|---|---|---|
| Spec módulo WA Integrations | 02_CREATE_MODULE_SPEC | PRÓXIMO |
| Tela /settings/integrations | 06_IMPLEMENTATION | Aguarda spec |
| Linkar deal → wa_conversation | 06_IMPLEMENTATION | Aguarda spec |
| Auditar Kanban implementado | 04_AUDITOR | Disponível |
