# Bootstrap — Projeto Next.js novo (D0)

Checklist para humanos e LLMs. Marque cada item antes de considerar o scaffold “pronto”.

---

## Fase 0 — Decisões (obrigatório)

- [ ] Preencher `TECH_STACK.template.md` (Node, Next, React, TS — **versões confirmadas**, não assumidas)
- [ ] Responder `auth/decision-supabase-vs-custom-jwt.md` e registrar ADR se houver JWT custom
- [ ] Definir modelo de tenant: single-tenant | multi-tenant (workspace_id)
- [ ] Definir idiomas da UI: PT / EN / ES (ver `i18n/README.md`)

---

## Fase 1 — Scaffold

- [ ] Next.js App Router + TypeScript strict
- [ ] Tailwind + shadcn/ui (comportamento sim, aparência 100% do design system)
- [ ] `src/app/globals.css` — tokens CSS (única fonte de cores)
- [ ] Pastas conforme `architecture/folder-structure.md`
- [ ] `env/env.example` copiado → `.env.local` (nunca commitar secrets)
- [ ] `next.config` com headers de `security/headers-csp.md`
- [ ] Middleware Supabase SSR (`addons/supabase/auth-ssr.md`)

---

## Fase 2 — Segurança base

- [ ] Nenhum `NEXT_PUBLIC_*` com secret/service_role
- [ ] Cookies de sessão: HttpOnly + Secure (prod) + SameSite=Lax
- [ ] Server Actions e Route Handlers autenticam **dentro** da função
- [ ] Zod valida input no servidor em toda mutação
- [ ] RLS habilitada em todas as tabelas user-facing (Supabase)
- [ ] ESLint guardrails de `tooling/eslint-guardrails.md`
- [ ] `productionBrowserSourceMaps: false`

---

## Fase 3 — Arquitetura base

- [ ] Camadas: View → ViewModel → UseCase → Repository
- [ ] Componentes não importam Supabase diretamente
- [ ] Server Actions só orqueiam (auth + UseCase + revalidate)
- [ ] Tipos de domínio em `src/types/`
- [ ] Estados UI: loading / empty / error em todo fluxo interativo

---

## Fase 4 — Tooling

- [ ] Husky ou hook pre-commit: lint + typecheck
- [ ] CI mínimo: `tsc --noEmit`, lint, testes de segurança (`testing/security-test-harness.md`)
- [ ] Skills instaladas (`skills/README.md`)

---

## Fase 5 — Antes do primeiro deploy

- [ ] Rodar checklist completo: `security/security-checklist.md`
- [ ] Revisão com skill `nextjs-security-audit`
- [ ] Variáveis de produção no host (Vercel/etc.) — não no repo
- [ ] CSP `connect-src` ajustado aos domínios reais da API

---

## Anti-patterns proibidos no D0

| ❌ | ✅ |
|---|---|
| Lógica de negócio em `page.tsx` | UseCase + ViewModel |
| `createClient()` service_role no client | Apenas server, fluxos documentados |
| Cores `gray-*` / hex no JSX | `var(--token)` |
| Server Action sem checagem de auth | `getUser()` / guards no início |
| SQL/migration ad-hoc em prod | Migration versionada |
