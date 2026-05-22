# 05 — Autenticação e Segurança

## Como funciona o login

1. Usuário preenche email + senha + Turnstile no `/login`
2. Server Action valida Turnstile no servidor
3. Server Action verifica rate limit por IP e por email
4. `supabase.auth.signInWithPassword()` no server client
5. Supabase retorna JWT; `@supabase/ssr` grava em cookie HttpOnly
6. Redirect para `/dashboard`
7. Se MFA ativo: redirect para `/mfa` para validar código TOTP

## Sessão e cookies

| Configuração | Valor |
|---|---|
| Storage | Cookie HttpOnly |
| Flags | `Secure; SameSite=Lax; Path=/` |
| Renovação | Automática via middleware do Supabase (`middleware.ts`) |
| Timeout de inatividade | Configurado em `src/lib/security/session-policy.ts` |
| Timeout absoluto | Configurado em `src/lib/security/session-policy.ts` |

> **Nunca** armazenar token em `localStorage` ou `sessionStorage`.

## MFA (Autenticação de 2 fatores)

- Tipo: TOTP (6 dígitos) via Supabase Auth
- Obrigatório para roles `owner` e `admin`
- Setup em `/mfa/setup` — gera QR Code via `qrcode.react`
- Verificação em `/mfa` após login bem-sucedido
- Desativar MFA disponível em `/settings` (com confirmação)

## Proteção de rotas

### Middleware (`src/middleware.ts`)
- Verifica sessão em toda requisição ao dashboard
- Redireciona `/login` se não autenticado
- Redireciona `/mfa` se MFA pendente

### Guards (`src/lib/guards.ts`)
- `getWorkspaceContext(supabase)` — extrai workspace do usuário autenticado; lança erro se sem workspace
- `requireSuperAdmin(supabase)` — exige flag `is_superadmin` na tabela `profiles`

## Rate Limiting (`src/lib/security/rate-limit.ts`)

Proteção contra brute force e abuso:

| Endpoint / Ação | Limite |
|---|---|
| Login | Por IP + por email |
| Registro | Por IP |
| Reset de senha | Por IP + por email |
| API de CEP | Por IP |

- Storage: tabela `rate_limits` no Supabase (persistente entre instâncias)
- Resposta em caso de limite: erro genérico sem vazar detalhes
- Auditoria: rate limit acionado gera entrada em `audit_logs`

## Anti-bot — Cloudflare Turnstile

- Ativo em: login, registro, reset de senha
- Validação **no servidor** via `src/lib/security/turnstile.ts`
- Site key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Secret key: `TURNSTILE_SECRET_KEY` (apenas servidor)

## RLS — Row Level Security

- Ativa em **todas** as tabelas CRM
- Função `my_workspace_ids()` (SECURITY DEFINER) — retorna workspaces do usuário autenticado
- Toda policy SELECT filtra por `workspace_id IN my_workspace_ids()`
- INSERT força `workspace_id` do contexto autenticado
- UPDATE e DELETE validam ownership
- Fix aplicado em 2026-04-28: recursão em `workspace_members` resolvida

## RBAC (Controle de Acesso por Role)

Roles padrão: `owner`, `admin`, `manager`, `sales`, `support`

- Permissões configuráveis por workspace em `workspace_roles` + `workspace_role_permissions`
- Fallback: matriz hardcoded em `src/lib/permissions.ts` quando sem RBAC customizado
- Verificação em Server Actions e componentes via `usePermissions` ViewModel
- Superadmin (`is_superadmin = true` em `profiles`): acesso total, dispensa workspace

## Uso do service_role (admin client)

`src/lib/supabase/admin.ts` — criado apenas no servidor, nunca exposto ao browser.

Usos legítimos:
- `audit_logs`: append-only via admin (usuário comum não pode alterar logs)
- Lookup de email em convites de membro (isolado, sem input livre do usuário)
- Operações de superadmin: gestão de workspaces, impersonation

> **Regra:** service_role NUNCA em fluxo de usuário comum. Se uma Server Action precisa de admin client para operação de usuário, revisar o design.

## Audit Log (`src/lib/audit/audit-log.ts`)

Todas as ações críticas geram entrada em `audit_logs`:

| Ação auditada |
|---|
| Login bem-sucedido / falha |
| Rate limit acionado |
| Criação / atualização de workspace |
| Convite e desativação de membro |
| Alteração de role / permissão |
| Setup / desativação de MFA |
| Impersonation |
| Upload de logo / avatar |
| Criação / edição / remoção de contato |

Campos: `user_id`, `workspace_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `session_id`, `metadata`, `created_at`

> `metadata` nunca contém senhas, tokens ou dados sensíveis.

## Headers de segurança

Configurados em `next.config.ts`:

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, microfone, geolocalização desabilitados |
| `Content-Security-Policy` | Configurado para Supabase + Turnstile + assets |

## Variáveis sensíveis

| Variável | Exposição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser (seguro) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (seguro com RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Apenas servidor |
| `TURNSTILE_SECRET_KEY` | Apenas servidor |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser (seguro) |

## Riscos de segurança em aberto

| ID | Risco | Status |
|---|---|---|
| R-002 | Webhooks CRM sem HMAC-SHA256 | ABERTO |
| R-003 | Supabase Vault não configurado — tokens WA em texto | ABERTO |
| R-004 | 2FA não obrigatório para role `manager` e abaixo | ACEITO |
| R-006 | Tabelas `wa_*` sem RLS do CRM | INFO / externo |

## Status do checklist de segurança

| Item | Status |
|---|---|
| RLS em todas as tabelas CRM | ✅ |
| workspace_id nunca do cliente | ✅ |
| service_role isolado | ✅ |
| Rate limit (login/register/reset) | ✅ |
| Cloudflare Turnstile | ✅ |
| 2FA obrigatório (owner/admin) | ✅ |
| Audit log | ✅ |
| Headers HTTP | ✅ |
| Cookies HttpOnly + Secure | ✅ |
| Session timeout | ✅ |
| Webhook HMAC | ⏳ Pendente |
| Supabase Vault (tokens WA) | ⏳ Pendente |
