# Decisão: Supabase Auth vs JWT customizado

**Pergunta obrigatória no D0 do projeto.** Registre a resposta em ADR (`decisions/adr-template.md`).

---

## Opção A — Supabase Auth (padrão recomendado)

**Use quando:**

- Usuários finais fazem login no seu app (email/senha, OAuth, MFA)
- Sessão via cookies `@supabase/ssr` + middleware
- RLS no Postgres amarrada a `auth.uid()`
- MFA/TOTP via GoTrue

**Prós:** RLS nativo, refresh token, MFA, menos código de auth  
**Contras:** acoplamento ao Supabase Auth; claims custom exigem hook (Custom Access Token)

---

## Opção B — JWT customizado (emissão própria)

**Use quando:**

- Integração BFF repassa JWT para **API externa** que valida claims
- Microserviço não usa Supabase Auth mas confia no mesmo issuer
- Custom Access Token Hook enriquece JWT Supabase (híbrido — **recomendado** vs JWT totalmente custom)

**Prós:** controle total de claims (`authz`, roles, tenant)  
**Contras:** risco de implementar auth errado (refresh, revogação, timing attacks)

---

## Opção C — Híbrido (padrão enterprise)

| Camada | Mecanismo |
|---|---|
| Login usuário | Supabase Auth + cookies HttpOnly |
| Autorização app | Claims JWT (hook ou leitura de `workspace_members`) |
| Chamada API externa | Repassar JWT do usuário (BFF) — **nunca** service_role no client |
| Operações admin cross-tenant | Server-only + service_role + audit log |

---

## Perguntas para decidir

Responda **sim/não** antes de implementar:

1. Usuários logam diretamente no app Next.js? → **Supabase Auth**
2. Precisa MFA? → **Supabase Auth**
3. API externa exige JWT com claims específicos? → **Hook ou BFF**
4. Múltiplos workspaces por usuário? → **RLS + contexto workspace no app** (não confiar só em `LIMIT 1` no banco)
5. Superadmin impersona tenant? → **Guard server-side + client scoped** (documentar ADR)
6. Mobile app nativo no futuro? → Avaliar PKCE / refresh fora de cookies

---

## O que NUNCA fazer

| ❌ | Motivo |
|---|---|
| JWT secret no `NEXT_PUBLIC_*` | Expõe no browser |
| Validar JWT só no middleware | Server Actions são endpoints públicos |
| service_role no client | Bypass total de RLS |
| Confiar em `workspace_id` do form | IDOR |

---

## Referências neste pacote

- `addons/supabase/auth-ssr.md`
- `security/server-actions-and-api-routes.md`
- `auth/session-cookies-policy.md`
