# INDEX.md

SDDS_VERSION: 1.3.2
Atualizado: 2026-06-09

## Ler primeiro
1. `CURRENT_STATE.md` — estado atual
2. `MEMORY.md` — contexto técnico

## Specs existentes
| Módulo | Summary | Spec | Contract | Harness |
|---|---|---|---|---|
| chat | `specs/chat.summary.md` | `specs/chat.spec.md` | `contracts/chat.contract.md` | `harness/chat.harness.md` |
| contacts (bulk import) | — | `specs/contacts-bulk-import.spec.md` | — | — |

> ⚠️ Spec de Chat é obsoleta — conversations/messages foram removidas. WA Integrations precisa de nova spec.

## Decisões (ADRs)
| ADR | Decisão |
|---|---|
| `decisions/ADR-001-whatsapp-architecture.md` | Frontend agnóstico ao provider WA; WA API é fonte de verdade |
| `decisions/ADR-002-bulk-import-sync-batches.md` | Importação de contatos: lotes síncronos (sem job queue) + escolha de `exceljs` sobre `xlsx` (CVEs) |
| `decisions/ADR-003-contact-multi-origin-junction-table.md` | Múltiplas origens por contato via tabela de junção `contact_source_assignments` (não tags livres) |
| `decisions/ADR-004-impersonation-owner-like-access.md` | Impersonação concede acesso owner-like ao workspace impersonado, validado via `getValidatedImpersonatedWorkspaceId` |

## Discoveries
| Discovery | Resumo |
|---|---|
| `discoveries/2026-05-20-wa-backend-architecture.md` | Backend WA tem 27 tabelas wa_* no mesmo Supabase; ponte via workspace_integrations |
| `discoveries/2026-06-08-business-niches-outage.md` | Outage site-wide: tabela `business_niches` dropada via SQL ad-hoc fora do framework de migrations, derrubando login de todos os usuários (PGRST200); restaurada via migration versionada |
| `discoveries/2026-06-08-contacts-rls-recursion.md` | Recursão infinita RLS (`42P17`) entre `contacts`/`contact_access` por subqueries cruzadas em policies (mesmo padrão já visto em `workspace_members`); corrigida com funções `SECURITY DEFINER` via migration `20260608170406` |
| `discoveries/2026-06-09-impersonation-tenant-isolation-bug.md` | `getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole` ignoravam o cookie de impersonação — escritas durante impersonação iam para o workspace do superadmin, não o impersonado; corrigido com `getValidatedImpersonatedWorkspaceId` |

## Sessões recentes
| Data | Evento |
|---|---|
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
