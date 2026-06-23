# INDEX — specs_default (English summary)

**Source of truth:** PT-BR files in `specs_default/` root.

## Quick start

1. `00-bootstrap-new-project.md` — D0 checklist  
2. `TECH_STACK.template.md` — pin versions before coding  
3. `auth/decision-supabase-vs-custom-jwt.md` — auth strategy  
4. `architecture/clean-arch-mvvm.md` — layers  
5. `security/security-checklist.md` — pre-deploy  

## Core topics

| Topic | File |
|---|---|
| Clean Architecture + MVVM | `architecture/clean-arch-mvvm.md` |
| Folder layout | `architecture/folder-structure.md` |
| Env & secrets | `security/env-and-secrets.md` |
| Server Actions | `security/server-actions-and-api-routes.md` |
| HttpOnly cookies | `auth/session-cookies-policy.md` |
| CSP / headers | `security/headers-csp.md` |
| Supabase SSR | `addons/supabase/auth-ssr.md` |
| RLS multi-tenant | `addons/supabase/rls-multi-tenant.md` |
| UI tokens | `ui/tokens-and-globals.md` |
| Skills install | `skills/README.md` |

## Skills (Claude / Cursor)

Copy from `skills/claude/` and `skills/cursor/` into the new project harness.

**Not included:** SDDS live-memory framework (separate product).
