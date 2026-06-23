---
name: nextjs-security-audit
description: Auditoria de segurança Next.js App Router — 17 vetores (NEXT_PUBLIC secrets, source maps, HttpOnly, CSP, Server Actions, IDOR, CORS). Use em "auditar segurança", pré-deploy, ou revisão de auth/API.
---

# Skill: nextjs-security-audit

Leia `specs_default/security/security-checklist.md` e inspecione:

```
.env*, next.config.*, middleware.ts
app/**/actions.ts, app/api/**/route.ts
lib/auth*, lib/supabase*, cookies
```

## Vetores críticos

1. `NEXT_PUBLIC_*` com secrets
2. Source maps em produção
3. Server Actions sem auth interna
4. service_role no client
5. RLS off / policies faltando
6. IDOR (workspace_id do client)
7. CSP/connect-src incorreto
8. Cookies sem HttpOnly
9. Webhooks sem HMAC
10. Erros vazando stack/PII
11. Rate limit ausente (auth)
12. Uploads sem validação MIME/tamanho

## Output

Relatório: 🚨 Crítico | ⚠️ Alto | ℹ️ Médio — com arquivo, evidência, fix sugerido.

Sem referência a SDDS — registrar ADR local se decisão arquitetural.
