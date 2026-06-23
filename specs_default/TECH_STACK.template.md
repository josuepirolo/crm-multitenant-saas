# TECH_STACK — Template (preencher no projeto novo)

> **Regra para LLMs:** se alguma versão estiver `A_CONFIRMAR` ou ausente, **pergunte ao dev** antes de gerar código com APIs específicas de versão.

---

## Runtime

| Componente | Versão | Status |
|---|---|---|
| Node.js | ex: 20.x LTS | A_CONFIRMAR |
| npm / pnpm | ex: pnpm 9 | A_CONFIRMAR |

## Frontend

| Componente | Versão | Status |
|---|---|---|
| Next.js | ex: 15.x / 16.x App Router | A_CONFIRMAR |
| React | (lockfile) | A_CONFIRMAR |
| TypeScript | strict: true | A_CONFIRMAR |
| Tailwind CSS | | A_CONFIRMAR |
| shadcn/ui + Radix | | A_CONFIRMAR |
| React Hook Form + Zod | | A_CONFIRMAR |
| Framer Motion | opcional | |

## Backend / dados

| Componente | Versão | Status |
|---|---|---|
| Supabase (Postgres + Auth) | | A_CONFIRMAR |
| @supabase/ssr | | A_CONFIRMAR |
| Auth strategy | Supabase Auth | ver `auth/decision-supabase-vs-custom-jwt.md` |
| JWT custom (BFF/integrações) | sim/não | ADR se sim |

## Testes

| Ferramenta | Uso |
|---|---|
| Vitest / Jest | unit + security |
| Playwright | e2e críticos (opcional D0) |

## Deploy

| Ambiente | Host | Branch |
|---|---|---|
| dev | | |
| staging | | |
| prod | | |

## Matriz de variáveis por ambiente

| Variável | dev | staging | prod |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | localhost | | |
| `NEXT_PUBLIC_SUPABASE_URL` | | | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | | | |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | server only | server only |
