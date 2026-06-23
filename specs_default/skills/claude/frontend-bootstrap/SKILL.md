---
name: frontend-bootstrap
description: Bootstrap de projeto Next.js novo usando specs_default — checklist D0, TECH_STACK, auth decision, estrutura de pastas, env, skills. Ative com /project-init ou "iniciar projeto frontend".
---

# Skill: frontend-bootstrap

## Passo 1 — Ler

1. `specs_default/README.md`
2. `specs_default/00-bootstrap-new-project.md`
3. `specs_default/TECH_STACK.template.md`

## Passo 2 — Perguntar ao dev

1. Versões Node/Next/React confirmadas?
2. Multi-tenant ou single-tenant?
3. Supabase Auth only ou JWT custom? → `auth/decision-supabase-vs-custom-jwt.md`
4. Locales UI: PT / EN / ES?
5. Host deploy?

## Passo 3 — Scaffold

- Pastas `architecture/folder-structure.md`
- `env/env.example` → `.env.local`
- `next.config` headers `security/headers-csp.md`
- Middleware Supabase `addons/supabase/auth-ssr.md`
- `globals.css` tokens `ui/tokens-and-globals.md`

## Passo 4 — Instalar skills

`specs_default/skills/README.md`

## Passo 5 — Validar

`security/security-checklist.md` antes do primeiro deploy.

**Não incluir SDDS** neste bootstrap.
