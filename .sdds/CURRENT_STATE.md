# CURRENT_STATE.md

SDDS_VERSION: 1.3.2
Atualizado: 2026-06-08
Bootstrap: recuperado de código real (sessão anterior sem persistência de .sdds/)

---

## Estado dos módulos

| Módulo | Status | Observação |
|---|---|---|
| Auth | IMPLEMENTADO | login, register (auto-cadastro DESATIVADO via flag, código preservado), MFA, reset, Turnstile, session policy |
| Contacts | IMPLEMENTADO | CRUD, filtros, paginação, multi-tenant, soft delete; importação em massa (XLSX/CSV) com preview (10 linhas + detecção de origem), lotes automáticos de 2.000 sem limite máximo, barra de progresso; `source_id` obrigatório no formulário manual; gerenciamento de origens (`ContactSourcesSheet`); apenas `.xlsx` e `.csv`; normalização de telefone E.164 (`normalizeBrazilianPhone`: DDI 55, nono dígito, DDD 55); `toTitleCase` PT-BR no parser (preposições minúsculas, espaços duplos colapsados); 4.324 nomes históricos normalizados em lote no banco; teste manual em navegador pendente |
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

- **Importação em massa de contatos (XLSX/CSV) — IMPLEMENTADA E COMMITADA (2026-06-08, branch dev)**: feature completa seguindo Clean Architecture+MVVM — spec (`specs/contacts-bulk-import.spec.md`), ADR-002 (lotes síncronos sem job queue + `exceljs` no lugar de `xlsx` por CVEs HIGH sem fix), tipos `ContactImportRow(Status)`/`ContactImportResult`, parsing puro em `lib/contacts/parse-contact-import.ts` (mapeia cabeçalhos PT/EN, valida com `contactSchema`/Zod, detecta duplicatas, limite 2000 linhas), `ImportContactsUseCase` (lotes de 50, `Promise.allSettled`), Server Action `importContactsAction` (rate limit `contactsBulkImport` 5/h, magic bytes, audit log `CONTACTS_BULK_IMPORTED`), `useContactImportViewModel`, componentes `ImportContactsDialog`/`ImportResultSummary`, botão "Importar planilha" integrado em `contacts-client.tsx`. Fluxo simplificado para 2 estágios (upload→resultado, sem preview). Validado: `tsc --noEmit` limpo, suíte completa 365/365 passando. Formato `.xls` (BIFF8) removido — aceitos apenas `.xlsx` e `.csv` (magic bytes validados explicitamente para ambos). **Pendente**: teste manual em navegador (upload real, dark mode, responsivo).
- **RLS recursion em `contacts`/`contact_access` — RESOLVIDO 2026-06-08**: `authenticated-rls.test.ts` falhava com `42P17 infinite recursion detected in policy for relation "contacts"` (bug pré-existente, introduzido pela migration `contact_portfolio` de 2026-06-02 — confirmado via `git stash` que já existia antes da feature de importação em massa). Causa: as policies de `contacts` (`contacts_select/update/delete_portfolio`) faziam subquery direta em `contact_access`, e as policies de `contact_access` (`select/insert/delete`) faziam subquery direta em `contacts` — toda referência a uma tabela dentro de uma policy ativa a RLS dela, formando um ciclo infinito. Mesmo padrão de bug já visto e corrigido em `workspace_members` (`20260428_fix_workspace_members_rls_recursion.sql`). Corrigido com `supabase/migrations/20260608170406_fix_contacts_contact_access_rls_recursion.sql`, aplicada em produção via `apply_migration` (projeto `gkzqhlaltnlcpzcapayb`): duas novas funções `SECURITY DEFINER` (`has_contact_access(p_contact_id)` bypassa RLS de `contact_access`; `contact_workspace_id(p_contact_id)` bypassa RLS de `contacts`) substituem as subqueries cruzadas nas 6 policies afetadas, preservando exatamente as mesmas regras de acesso (owner/admin/manager, assigned_to, compartilhamento explícito). Suíte completa: 365/365 passando.

- **Normalização de telefone brasileiro — IMPLEMENTADA (2026-06-09, branch dev, não commitada)**: `normalizeBrazilianPhone(raw)` em `src/lib/validations/contact.ts` — detecta comprimento de dígitos para normalizar para E.164 sem `+`; adiciona DDI 55 quando ausente; injeta nono dígito apenas em celulares (8 dígitos pós-DDD, iniciam 6-9); trata ambiguidade DDI 55 vs DDD 55 (Três Lagoas/MS) pelo comprimento total. Aplicada em `parse-contact-import.ts` (importação planilha) e `actions.ts` (formulário manual). `normalizePhone` delega para ela. tsc limpo, 365/365 passando.

## Próximas ações disponíveis

| Ação | Módulo SDDS | Status |
|---|---|---|
| Spec módulo WA Integrations | 02_CREATE_MODULE_SPEC | PRÓXIMO |
| Tela /settings/integrations | 06_IMPLEMENTATION | Aguarda spec |
| Linkar deal → wa_conversation | 06_IMPLEMENTATION | Aguarda spec |
| Auditar Kanban implementado | 04_AUDITOR | Disponível |
