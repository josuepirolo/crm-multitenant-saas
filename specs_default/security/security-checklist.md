# Checklist de segurança — pré-deploy

## Ambiente

- [ ] Nenhum secret em `NEXT_PUBLIC_*`
- [ ] `.env.local` no `.gitignore`
- [ ] `productionBrowserSourceMaps: false`
- [ ] Variáveis de prod só no host

## Auth / sessão

- [ ] Cookies HttpOnly + Secure (prod) + SameSite=Lax
- [ ] Server Actions autenticam internamente
- [ ] Logout limpa cookies derivados
- [ ] MFA testado se habilitado

## Dados

- [ ] RLS ON em todas tabelas user-facing
- [ ] Policies testadas (tenant isolation)
- [ ] service_role isolado de fluxo usuário
- [ ] Migrations versionadas — zero DDL ad-hoc prod

## API

- [ ] Zod em toda mutação server
- [ ] Rate limit login/register/reset
- [ ] Webhooks com HMAC
- [ ] IDOR testado (acesso cross-tenant negado)

## Frontend

- [ ] CSP configurado e testado
- [ ] Headers segurança em `next.config`
- [ ] Nenhum token em localStorage
- [ ] RSC boundary — mínimo serializado

## Tooling

- [ ] ESLint guardrails ativos
- [ ] Testes security suite passando
- [ ] `npm audit` / dependabot revisado

## Processo

- [ ] ADR para decisões auth/JWT/tenant
- [ ] Skill security-review antes de commit sensível

---

**Severidade em auditoria:** 🚨 Crítico | ⚠️ Alto | ℹ️ Médio

Use skill `nextjs-security-audit` para varredura completa dos 17 vetores.
