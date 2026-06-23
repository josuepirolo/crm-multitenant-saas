# Questionário — intake projeto novo

Responder **antes** do LLM gerar scaffold. Registrar ADRs quando aplicável.

## Produto

1. Nome e domínio do app?
2. Single-tenant ou multi-tenant (workspace)?
3. Idiomas UI: PT / EN / ES — quais ativos no lançamento?
4. Público: B2B SaaS | B2C | internal tool?

## Auth (ver `auth/decision-supabase-vs-custom-jwt.md`)

5. Login via Supabase Auth (email/OAuth)? sim/não
6. MFA obrigatório para admins? sim/não
7. JWT custom ou claims extras necessários? sim/não → ADR
8. API externa via BFF repassando JWT do usuário? sim/não
9. Impersonation admin? sim/não → ADR

## Dados

10. Supabase Postgres confirmado? sim/não
11. Realtime necessário? sim/não
12. Storage de arquivos (avatars, anexos)? sim/não → policies

## Segurança

13. Captcha no login (Turnstile)? sim/não
14. Rate limit agressivo em auth? sim/não
15. Webhooks inbound? sim/não → HMAC
16. Compliance extra (LGPD export/delete)? sim/não

## UI

17. Brand existente ou greenfield?
18. Dark mode day-1? sim/não
19. Mobile-first crítico? sim/não

## Ops

20. Host deploy (Vercel, etc.)?
21. Ambientes: dev + staging + prod?
22. CI provider?

## Stack (preencher `TECH_STACK.template.md`)

23. Node version confirmada?
24. Next.js version confirmada?
25. Package manager: npm | pnpm | yarn?

---

**Saída esperada do LLM:** resumo das respostas + lista de arquivos a criar + riscos + ADRs sugeridos.
