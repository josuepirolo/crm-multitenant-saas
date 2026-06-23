# INDEX — specs_default (resumen ES)

**Fuente de verdad:** archivos PT-BR en la raíz de `specs_default/`.

## Inicio rápido

1. `00-bootstrap-new-project.md` — checklist D0  
2. `TECH_STACK.template.md` — versiones confirmadas  
3. `auth/decision-supabase-vs-custom-jwt.md` — estrategia auth  
4. `architecture/clean-arch-mvvm.md` — capas  
5. `security/security-checklist.md` — pre-deploy  

## Temas principales

| Tema | Archivo |
|---|---|
| Clean Architecture + MVVM | `architecture/clean-arch-mvvm.md` |
| Estructura de carpetas | `architecture/folder-structure.md` |
| Variables y secretos | `security/env-and-secrets.md` |
| Server Actions | `security/server-actions-and-api-routes.md` |
| Cookies HttpOnly | `auth/session-cookies-policy.md` |
| CSP / headers | `security/headers-csp.md` |
| Supabase SSR | `addons/supabase/auth-ssr.md` |
| RLS multi-tenant | `addons/supabase/rls-multi-tenant.md` |
| Tokens UI | `ui/tokens-and-globals.md` |
| Instalar skills | `skills/README.md` |

## Skills (Claude / Cursor)

Copiar desde `skills/claude/` y `skills/cursor/` al nuevo proyecto.

**No incluido:** framework SDDS de memoria viva (producto aparte).
