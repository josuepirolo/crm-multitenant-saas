---
name: security-review-gate
description: Gate de segurança OBRIGATÓRIO antes de alterar Server Actions, API Routes, repositories, auth, RLS, uploads, webhooks — e antes de git commit/push nessas áreas.
---

# Skill: security-review-gate

Consulte `specs_default/security/` e marque mentalmente:

## Antes de alterar código

- [ ] tenant/workspace_id do contexto server — nunca do client
- [ ] RLS ON nas tabelas tocadas
- [ ] service_role só fluxo server documentado
- [ ] Zod no servidor
- [ ] Nenhum secret em NEXT_PUBLIC ou resposta client
- [ ] Erros genéricos ao client; log detalhado só server
- [ ] Cookies HttpOnly + Secure (prod) + SameSite=Lax
- [ ] IDOR verificado
- [ ] Rate limit em auth/convite/bulk

## Antes de commit/push

- [ ] git diff: sem .env, pem, credentials
- [ ] Logs novos sem token/senha/PII
- [ ] Migration versionada se DDL/RLS
- [ ] test:security passando se auth/tenant

Violação → corrigir antes de commit. Não usar `--no-verify`.
