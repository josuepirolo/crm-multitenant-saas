# 11 — Como Recriar o Projeto do Zero

## Pré-requisitos

- Node.js 20+
- npm
- Supabase CLI (`npm i -g supabase`)
- Conta no Supabase (cloud) ou Supabase local
- Conta no Cloudflare (para Turnstile)
- Git

## 1. Clonar e instalar

```bash
git clone https://github.com/josuepirolo/crm-multitenant-saas.git
cd crm-multitenant-saas
npm install
```

## 2. Configurar variáveis de ambiente

Criar `.env.local` na raiz (não commitar):

```env
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]

NEXT_PUBLIC_TURNSTILE_SITE_KEY=[site_key_cloudflare]
TURNSTILE_SECRET_KEY=[secret_key_cloudflare]
```

> Nunca commitar `.env.local`. Está no `.gitignore`.

## 3. Configurar banco de dados

### Opção A — Supabase Cloud

```bash
supabase login
supabase link --project-ref [SEU_PROJECT_REF]
supabase db push
```

Isso aplicará todas as 34 migrations em ordem.

### Opção B — Supabase local

```bash
supabase start
supabase db push
```

## 4. Configurar Supabase Auth

No painel do Supabase:

1. **Auth → Providers:** habilitar Email/Password
2. **Auth → Email:** configurar templates de confirmação e reset (opcional em dev)
3. **Auth → MFA:** habilitar TOTP
4. **Auth → URL Configuration:** adicionar `http://localhost:3000/auth/callback` como redirect URL

## 5. Configurar Storage

No painel do Supabase:

1. Criar bucket `workspace-logos` — privado
2. Criar bucket `avatars` — privado
3. As políticas RLS são aplicadas pelas migrations

## 6. Criar primeiro superadmin

Após rodar as migrations, criar um usuário via Supabase Auth e setar `is_superadmin = true` em `profiles`:

```sql
UPDATE profiles SET is_superadmin = true WHERE email = 'seu@email.com';
```

## 7. Rodar em desenvolvimento

```bash
npm run dev
```

Acesso em `http://localhost:3000`.

## 8. Criar primeiro tenant (workspace)

Usar o script CLI de onboarding:

```bash
node scripts/create-tenant.mjs
```

Ou criar via registro na tela `/register`.

## 9. Rodar testes

```bash
npm test                  # todos os testes
npm run test:coverage     # com cobertura
```

> Testes de integração (`integration/`) precisam de banco real configurado.

## Ordem recomendada de implementação (para projeto novo)

Se começar do zero (sem clonar):

1. `npx create-next-app@latest` com TypeScript e App Router
2. Instalar Supabase e configurar auth
3. Instalar Tailwind v4 + shadcn/ui
4. Criar schema inicial (`workspaces`, `profiles`, `workspace_members`)
5. Implementar RLS básico
6. Implementar auth (login, register, callback)
7. Implementar guards e middleware
8. Implementar camadas: Repository → UseCase → ViewModel → View
9. Adicionar features uma a uma (Contacts → Kanban → Settings → ...)
10. Adicionar segurança (rate limit, Turnstile, audit log, headers)
11. Adicionar testes de segurança e isolamento de tenant

## Cuidados importantes

- **Nunca desabilitar RLS**, mesmo em desenvolvimento
- **Nunca usar service_role em fluxo de usuário comum**
- Toda nova tabela deve ter `workspace_id` e políticas RLS
- Toda nova Server Action deve chamar `getWorkspaceContext()` antes de qualquer operação
- Não commitar `.env*` — apenas `.env.example` com valores em branco
- Aplicar migrations via `supabase db push` — nunca editar banco diretamente em produção

## Comandos úteis

```bash
npm run dev              # servidor de desenvolvimento
npm run build            # build de produção
npm run typecheck        # verificação de tipos
npm run lint             # linting
npm test                 # testes
npm run db:migration     # criar nova migration
npm run db:push          # aplicar migrations
npm run db:status        # status das migrations
npm run db:diff          # diff do schema
```
