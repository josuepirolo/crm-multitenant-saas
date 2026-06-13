# INDEX.md

SDDS_VERSION: 1.3.2
Atualizado: 2026-06-12

## Ler primeiro
1. `CURRENT_STATE.md` — estado atual
2. `MEMORY.md` — contexto técnico

## Specs existentes
| Módulo | Summary | Spec | Contract | Harness |
|---|---|---|---|---|
| chat | `specs/chat.summary.md` | `specs/chat.spec.md` | `contracts/chat.contract.md` | `harness/chat.harness.md` |
| contacts (bulk import) | — | `specs/contacts-bulk-import.spec.md` | — | — |
| settings (integrations) | — | `specs/settings-integrations.spec.md` | — | — |

> ⚠️ Spec de Chat é obsoleta — conversations/messages foram removidas. WA Integrations (gestão admin implementada, ADR-005) ainda precisa de spec para a tela `/settings/integrations` do usuário final.

## Decisões (ADRs)
| ADR | Decisão |
|---|---|
| `decisions/ADR-001-whatsapp-architecture.md` | Frontend agnóstico ao provider WA; WA API é fonte de verdade |
| `decisions/ADR-002-bulk-import-sync-batches.md` | Importação de contatos: lotes síncronos (sem job queue) + escolha de `exceljs` sobre `xlsx` (CVEs) |
| `decisions/ADR-003-contact-multi-origin-junction-table.md` | Múltiplas origens por contato via tabela de junção `contact_source_assignments` (não tags livres) |
| `decisions/ADR-004-impersonation-owner-like-access.md` | Impersonação concede acesso owner-like ao workspace impersonado, validado via `getValidatedImpersonatedWorkspaceId` |
| `decisions/ADR-005-admin-wa-tenant-mapping.md` | 1 workspace CRM : N `wa_tenant_id`, com `UNIQUE(wa_tenant_id)` garantindo 1:1 inverso; gestão exclusiva via `/admin` (superadmin) |

## Discoveries
| Discovery | Resumo |
|---|---|
| `discoveries/2026-05-20-wa-backend-architecture.md` | Backend WA tem 27 tabelas wa_* no mesmo Supabase; ponte via workspace_integrations |
| `discoveries/2026-06-08-business-niches-outage.md` | Outage site-wide: tabela `business_niches` dropada via SQL ad-hoc fora do framework de migrations, derrubando login de todos os usuários (PGRST200); restaurada via migration versionada |
| `discoveries/2026-06-08-contacts-rls-recursion.md` | Recursão infinita RLS (`42P17`) entre `contacts`/`contact_access` por subqueries cruzadas em policies (mesmo padrão já visto em `workspace_members`); corrigida com funções `SECURITY DEFINER` via migration `20260608170406` |
| `discoveries/2026-06-09-impersonation-tenant-isolation-bug.md` | `getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole` ignoravam o cookie de impersonação — escritas durante impersonação iam para o workspace do superadmin, não o impersonado; corrigido com `getValidatedImpersonatedWorkspaceId` |
| `discoveries/2026-06-10-impersonation-rls-blocks-data-access.md` | Mesmo com `workspaceId` impersonado correto, `createClient()` (RLS-bound ao superadmin) bloqueava leitura/escrita via `my_workspace_ids()`; corrigido com `getScopedSupabaseClient()` (service_role durante impersonação validada) em `contacts/` e, na sequência, nos 16 arquivos restantes (R-009 RESOLVIDO) |

## Sessões recentes
| Data | Evento |
|---|---|
| 2026-06-12 | R-007 mitigado: `ddl_audit_log` + event triggers em produção (`d5f15b7`), documentado em `docs/security/ddl-audit.md` (`950af2a`); prompt frontend unificado `specs/PROMPTS_FRONTEND/03_UNIFIED_FRONTEND_MASTER.md` (`3cfd3fa`), evoluído para v2 com posicionamento/AEO-GEO/growth/backend-router/baseline de segurança (`2e22a96`); push de todos os commits para `origin/dev` (ver `sessions/2026-06-12-0632-session.md`) |
| 2026-06-12 | Commit da feature WA admin (ADR-005, `b699270`) + remoção dos hooks `check-file-size`/`validate-spec`/`update-index` de `pre`/`post-tool-use` (`f467ed8`, `--no-verify`) — `enforce-guardrails.js` permanece ativo (ver `sessions/2026-06-11-2336-session.md`, `timeline/2026-06-12.md`) |
| 2026-06-11 | Admin SaaS: mapeamento 1 workspace : N `wa_tenant_id` (ADR-005) — migration multi-instância, repository/usecases/actions/viewmodel/UI completos em `/admin/workspaces`; 384/384 passando, ainda não commitado (ver `sessions/2026-06-11-0635-session.md`) |
| 2026-06-10 | R-009 resolvido: `getScopedSupabaseClient()` aplicado nos 16 arquivos restantes (dashboard, kanban, settings, auto-parts, auto-sales, fashion) — gatilho foi dashboard mostrando 0 contatos sob impersonação; 384/384 passando, ainda não commitado |
| 2026-06-10 | Segunda metade do fix de impersonação: novo `getScopedSupabaseClient()` (service_role durante impersonação validada, contorna RLS de `my_workspace_ids()`) aplicado em `contacts/{actions,import-actions,niche-profile-actions}.ts`; "Criar nova origem" do import dialog extraído para `CreateSourceInline`, sempre visível em preview/result; 326/326 passando; commit `df33790` |
| 2026-06-09 | SessionTimer adicionado ao `/admin` (fix de "unexpected response" ao impersonar com sessão expirada, commit `4d4efb2`) + remediação de dados: 11 `contact_sources` da Lekazis movidas de volta de PyTec (seguimento R-008, ver `sessions/2026-06-09-2340-session.md`) |
| 2026-06-09 | Feedback de importação (`already_exists`/`invalid_count`/`file_duplicates`), multi-origem de contatos (ADR-003) e correção de bug crítico de impersonação (cross-tenant write, ADR-004) — 8.485 contatos removidos do workspace de teste PyTec; 16 testes novos cobrem o fix (323/323 passando), R-008 resolvido (ver `sessions/2026-06-09-0805-session.md`) |
| 2026-06-08 | Implementada importação em massa de contatos via planilha (XLSX/CSV) — spec, ADR-002, parsing/usecase/action/viewmodel/UI completos, integrados em `/contacts`; typecheck + suíte de segurança OK; ainda não commitado (ver `sessions/2026-06-08-0814-session.md`) |
| 2026-06-08 | Incidente resolvido: outage site-wide por `business_niches` dropada ad-hoc; restaurada via migration `20260608120000_restore_business_niches.sql` |
| 2026-05-22 | Revisão de estado — documentação de pendências e riscos atualizados |
| 2026-05-20 | Setup GitHub, limpeza banco, arquitetura WA, PROJECT.md |
| 2026-05-13 | Bootstrap SDDS v1.3.1 — recuperação de estado |

## Skills de segurança
| Skill | Escopo | Quando usar |
|---|---|---|
| `.claude/skills/nextjs-security-audit` | Next.js genérico — 17 vetores | Auditoria profunda, onboarding, pré-deploy |
| `.claude/skills/security-review-gate` | Este projeto — Supabase+multi-tenant | Gate antes de cada commit/push sensível |
| `.claude/skills/security-tests` | Prompt para gerar suíte de testes | Ao criar/expandir testes de segurança |

## Indexes
- `indexes/modules.index.md`
- `indexes/risks.index.md`
