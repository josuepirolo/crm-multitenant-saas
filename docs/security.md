# Segurança — CRM Vendas WhatsApp

Documentação da camada de segurança implementada no SaaS multi-tenant.

---

## Rate Limit

**Arquivos:** `src/lib/security/rate-limit.ts`, `src/lib/security/client-ip.ts`

Rate limit em-memória por IP e por e-mail, aplicado antes de qualquer chamada ao Supabase.

| Action | Janela | Máximo |
|---|---|---|
| Login | 15 min | 5 tentativas |
| Registro | 60 min | 5 tentativas |
| Forgot password | 60 min | 3 tentativas |
| Update password | 15 min | 5 tentativas |

- IP extraído de `x-forwarded-for` / `x-real-ip` (Cloudflare-aware)
- Resposta genérica — nunca revela estado interno
- **Limitação:** in-memory não persiste entre instâncias. Para multi-instância em produção, substituir por Redis ou Upstash KV

---

## Auditoria

**Arquivos:** `src/lib/audit/audit-log.ts`, `supabase/migrations/20260425_audit_logs.sql`

### Tabela `audit_logs`

| Campo | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid | ✅ |
| `workspace_id` | uuid (FK workspaces) | — |
| `user_id` | uuid (FK auth.users) | — |
| `action` | text | ✅ |
| `entity_type` | text | — |
| `entity_id` | uuid | — |
| `ip_address` | text | — |
| `user_agent` | text | — |
| `metadata` | jsonb | ✅ (default `{}`) |
| `created_at` | timestamptz | ✅ (default now()) |

### RLS

- **SELECT:** membros autenticados leem logs do próprio workspace
- **INSERT/UPDATE/DELETE via client:** bloqueado — somente `service_role` escreve
- Logs são append-only por design

### Ações auditadas

| Ação | `action` | Quando |
|---|---|---|
| Login bem-sucedido | `login_success` | `signIn` → auth ok |
| Falha de login | `login_failure` | `signIn` → auth error |
| Rate limit acionado | `rate_limit_triggered` | qualquer action bloqueada |
| Registro completo | `register_success` | `signUp` → workspace criado |
| Workspace atualizado | `workspace_updated` | `updateWorkspace` → ok |
| Membro convidado | `member_invited` | `inviteMember` → ok |
| Role atualizado | `member_role_updated` | `updateMemberRole` → ok |
| Membro desativado | `member_deactivated` | `deactivateMember` → ok |

### Sanitização de metadata

Chaves cujo nome contém `password`, `token`, `secret`, `key`, `pwd` ou `auth` são removidas automaticamente antes de gravar.

---

## Headers de Segurança HTTP

**Arquivo:** `next.config.ts`

Aplicados em todas as rotas via `headers()` do Next.js.

| Header | Valor |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Content-Security-Policy` | ver abaixo |

### CSP

```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com
style-src 'self' 'unsafe-inline'
img-src 'self' blob: data: https:
font-src 'self'
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com
frame-src https://challenges.cloudflare.com
frame-ancestors 'none'
object-src 'none'
base-uri 'self'
```

- `frame-ancestors 'none'` — anti-clickjacking
- `object-src 'none'` — impede plugins (Flash, Java)
- `base-uri 'self'` — impede base tag injection
- `Cross-Origin-Opener-Policy: same-origin` — proteção Spectre
- Cobre Supabase (HTTPS + WSS) e Cloudflare Turnstile

---

## Hardening de Erros

**Arquivo:** `src/lib/security/security-errors.ts`

### `publicError(err, publicMsg)`

Usar em todos os catch blocks de Server Actions:

```typescript
} catch (err) {
  return publicError(err, "Mensagem segura para o usuário.");
}
```

- Loga o erro real em `console.error` (server-side, truncado em 300 chars)
- Retorna apenas `publicMsg` ao cliente
- Nunca expõe `err.message`, `err.stack` ou detalhes internos

Aplicado em: `settings/actions.ts` — todos os catch blocks.

---

## Rodar os Testes

```bash
# Todos os testes de segurança (unitários + análise estática)
npx vitest run src/tests/security/

# Testes de integração RLS (requer conexão com Supabase)
npx vitest run src/tests/integration/
```

### Suíte atual

| Arquivo | Testes | O que valida |
|---|---|---|
| `environment-security.test.ts` | 6 | service_role isolado, NEXT_PUBLIC_ sem secrets |
| `rate-limit.test.ts` | 12 | janela deslizante, isolamento por chave, configs |
| `auth-actions.test.ts` | 22 | guards, erros genéricos, audit, rate limit nas actions |
| `settings-actions.test.ts` | 28 | guards, workspace_id do contexto, audit nas actions |
| `audit-log.test.ts` | 15 | inserção, sanitização, resiliência a falhas |
| `security-headers.test.ts` | 26 | todos os headers, diretivas CSP, cobertura Supabase/Turnstile |
| `hardening.test.ts` | 15 | publicError, err.stack ausente, guards obrigatórios |
| `supabase-rls-live.test.ts` | 17 | RLS anon/service_role no Supabase real |
| `authenticated-rls.test.ts` | 12 | isolamento multi-tenant com sessões reais |
| **Total** | **153** | |

---

## Lacunas Conhecidas

| Item | Status | Próximo passo |
|---|---|---|
| Rate limit multi-instância | ⚠️ in-memory | Substituir por Redis/Upstash |
| Z-API — frontend não chama direto | 🔲 não testado | Criar testes de análise estática |
| Webhook secret | 🔲 não implementado | HMAC-SHA256 na rota de webhook |
| `unsafe-eval` / `unsafe-inline` no CSP | ⚠️ necessário para Next.js | Avaliar nonce para produção |
| 2FA para admins | 🔲 não implementado | Nível enterprise |
| Audit logs lidos pelo super_admin | 🔲 policy ausente | Criar policy por role |
