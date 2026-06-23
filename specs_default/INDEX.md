# INDEX — Roteador para LLMs

**Leia nesta ordem ao iniciar um projeto novo:**

| # | Arquivo | Quando |
|---|---|---|
| 0 | `COMO-USAR-PROJETO-NOVO.md` | **Copiar pacote para novo repo** — ordem LLM + env + decisões embutidas |
| 1 | `00-bootstrap-new-project.md` | Primeiro dia / scaffold |
| 2 | `TECH_STACK.template.md` | Antes de gerar código com APIs específicas de versão |
| 3 | `auth/decision-supabase-vs-custom-jwt.md` | Antes de implementar auth |
| 4 | `architecture/clean-arch-mvvm.md` | Antes de qualquer feature |
| 5 | `architecture/folder-structure.md` | Ao criar pastas |
| 6 | `security/env-and-secrets.md` | Ao configurar `.env` |
| 7 | `addons/supabase/auth-ssr.md` | Setup Supabase + middleware |
| 8 | `ui/tokens-and-globals.md` | Antes de UI |
| 9 | `security/security-checklist.md` | Antes de commit/deploy |

---

## Por tarefa

| Tarefa | Specs |
|---|---|
| Nova página/feature | `architecture/*`, `ui/component-states.md` |
| Server Action / API Route | `security/server-actions-and-api-routes.md`, `security/rate-limiting-validation.md` |
| Auth / sessão / cookies | `auth/*`, `security/cookies-middleware.md` |
| Banco / tenant / RLS | `addons/supabase/rls-multi-tenant.md`, `addons/supabase/migrations-policy.md` |
| Headers / CSP | `security/headers-csp.md` |
| Auditoria de segurança | `security/security-checklist.md`, `skills/claude/nextjs-security-audit/` |
| Gate pré-commit | `skills/claude/security-review-gate/`, `tooling/eslint-guardrails.md` |
| Performance | `performance/nextjs-react.md` |
| Decisão arquitetural | `decisions/adr-template.md` |
| Intake projeto novo | `questions/new-project-intake.md` |

---

## Skills (ativar no harness)

| Skill | Caminho |
|---|---|
| Arquitetura | `skills/claude/arquitetura/SKILL.md` |
| UI | `skills/claude/ui-execution-rules/SKILL.md` |
| Auditoria Next.js | `skills/claude/nextjs-security-audit/SKILL.md` |
| Gate segurança | `skills/claude/security-review-gate/SKILL.md` |
| Bootstrap projeto | `skills/claude/frontend-bootstrap/SKILL.md` |

Cursor: copiar `skills/cursor/rules/*.mdc` → `.cursor/rules/` e `skills/cursor/commands/*` → `.cursor/commands/`.

---

## Idiomas

- **PT-BR:** specs nesta pasta (fonte de verdade)
- **EN:** `i18n/en/INDEX.md`
- **ES:** `i18n/es/INDEX.md`
