# Discovery — Backend WA rejeitava JWT ES256 do Supabase (401) — RESOLVIDO

Data: 2026-06-14
Relacionado: [[ADR-007-autorizacao-cross-service-claims-jwt]], [[ADR-006-bff-wa-backend-management]]

## ✅ RESOLVIDO (2026-06-14) — fim de fim verde

O time do backend WA corrigiu a validação (passou a aceitar ES256 via JWKS). Confirmado ao vivo:
o backend agora responde **HTTP 200** ao `GET /management/tenants/14ee144b/instances` com um token
válido, retornando a instância real (`"Lekazis Disparos"`, connected, `5544997000434`).

Validação completa da cadeia ADR-007 (Fase 1):
1. `jdredes` foi adicionado como **manager** do workspace **Lekazis** (`1ae64f35…`) em `workspace_members`.
2. O próximo token do `jdredes` passou a trazer `workspaces["1ae64f35…"] = {role:manager, perms:[connection:view]}`
   (além de PyTec→owner→3 perms; superadmin:true).
3. O WA leu o claim, resolveu o binding `tenant 14ee144b → workspace 1ae64f35` e **autorizou** (200).

Membership-gap do ADR-006 deixou de ser bloqueador: a Fase 1 do WA usa o **claim** (não `wa_tenant_members`).

> Artefato de teste: a membership `jdredes`→Lekazis (role manager) foi inserida para validar; **remover
> depois se for só teste** (Settings → Membros → desativar, ou DELETE/soft-delete em `workspace_members`).

---

## Histórico do problema (mantido para referência)

## Resumo

Com o Custom Access Token Hook **habilitado e validado ao vivo** (o claim `authz` sai correto nos
tokens), ao chamar o backend WA (`https://messageapi.py.tec.br`) com um token **válido e recém-emitido**
ele responde:

```
HTTP 401
{"detail":"Token inválido ou expirado"}
```

O token **não** está expirado nem malformado — o problema é a **validação de assinatura** do
`require_auth` (FastAPI, `app/core/auth.py`) do backend WA, que **não está aceitando ES256**.

## Evidência (lado CRM está correto)

| Item | Valor |
|---|---|
| Algoritmo de assinatura do access token | **ES256** |
| `kid` | `b88e0f82-aade-4786-970d-0a7e7afbcada` |
| JWKS do projeto (`/auth/v1/.well-known/jwks.json`) | publica **exatamente** essa chave ES256 (`kty=EC`, `crv=P-256`, `use=sig`) |
| `iss` | `https://gkzqhlaltnlcpzcapayb.supabase.co/auth/v1` |
| `aud` | `authenticated` |
| `/health` no WA | 404 (rota não existe, mas o servidor responde → está no ar) |
| `GET /management/tenants/{id}/instances` com token válido | `401 {"detail":"Token inválido ou expirado"}` |

Conclusão: o token é íntegro e **verificável via JWKS**. O CRM emite o token certo. O 401 é
**exclusivamente do lado do backend WA**.

## Causa provável

Migração de JWT do Supabase para **chaves assimétricas (ES256)**. O backend WA provavelmente ainda
valida com o **segredo HS256 legado** (`SUPABASE_JWT_SECRET`) — ou tem cache de JWKS desatualizado —
enquanto os tokens de usuário passaram a ser assinados em ES256. Validação HS256 contra token ES256 →
falha → 401.

> Observação: a doc de handoff (`wa-backend-integration-contracts.md` §0) afirma que o WA valida via
> JWKS. Na prática (deploy atual) isso não está aceitando ES256 — versão implantada diverge da doc, ou
> cache stale, ou ainda em HS256.

## Impacto

Bloqueia **as duas pontas** da integração — **mas nada disso é corrigível no CRM**:

1. **UI de Integrações (T1, ADR-006):** o BFF repassa o JWT do usuário ao WA; com 401, a aba mostra
   "serviço indisponível / sem acesso". Dados reais (status/QR/restart) ficam indisponíveis até o WA
   aceitar o token.
2. **Passo 4 (WA Fase 1, ADR-007):** o WA nem consegue **validar** o token para **ler** o claim `authz`.
   O claim já está sendo emitido corretamente (passo 3 do CRM concluído), mas é inerte até o WA validar.

Há ainda um **segundo** bloqueador independente para ver dados reais via UI: o *membership gap* do
ADR-006 (ser membro do `workspace` CRM ≠ ser `wa_tenant_members`; ex.: `jdredes` não é membro do
wa_tenant do Lekazis → 403 mesmo após o 401 ser resolvido).

## Ação (lado WA — handoff entregue ao time do backend)

`require_auth` deve validar a assinatura via **JWKS com `algorithms=["ES256"]`**, buscando o JWKS atual
(`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`) e checando `iss`/`aud=authenticated`. Se hoje usa
`SUPABASE_JWT_SECRET` (HS256), migrar para JWKS — o projeto não assina mais tokens de usuário em HS256.

Nada a alterar no CRM. Quando o WA aceitar ES256, o passo 4 destrava (o claim já está presente).

## Como reproduzir (sem captcha)

Tokens via password-grant batem no Turnstile. Para mintar um token de teste sem captcha, usar o fluxo
admin `POST /auth/v1/admin/generate_link` (type=magiclink) → `POST /auth/v1/verify`
(`token_hash`) → `access_token`, e chamar o WA com `Authorization: Bearer <token>`. (Foi assim que o
401 foi capturado; usuários descartáveis criados/apagados com resíduo zero.)
