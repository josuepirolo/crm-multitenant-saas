# CRM Vendas WhatsApp — Documentação do Projeto

## Visão Geral

Plataforma SaaS multi-tenant para gestão de vendas via WhatsApp. Cada empresa (workspace) é isolada com dados próprios, permissões e nicho de mercado configurável.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 (config via CSS `@theme inline`) |
| Componentes | shadcn/ui + Radix UI |
| Backend / DB | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| Autenticação | Supabase Auth + `@supabase/ssr` |
| Formulários | React Hook Form + Zod |
| Animações | Framer Motion |
| Toasts | Sonner |
| Anti-bot | Cloudflare Turnstile |
| Arquitetura | Clean Architecture + MVVM |

---

## Arquitetura

```
View (components/)
  ↓ props + callbacks
ViewModel (viewmodels/)
  ↓ chama UseCases
UseCase (usecases/)
  ↓ chama Repositories
Repository (repositories/)
  ↓ acessa
Supabase (lib/supabase/)
```

### Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/         — login, registro, MFA, recuperação de senha
│   ├── (dashboard)/    — área autenticada (todas as features)
│   ├── (admin)/        — painel superadmin
│   └── api/            — route handlers
├── components/
│   ├── ui/             — componentes base (shadcn/ui + customizados)
│   └── [feature]/      — componentes por funcionalidade (View)
├── viewmodels/         — hooks de estado e lógica de apresentação
├── usecases/           — regras de negócio (um por caso de uso)
├── repositories/       — interface + implementação Supabase
├── lib/
│   ├── supabase/       — clientes browser/server/admin/middleware
│   ├── security/       — rate limit, Turnstile, CSRF, session policy
│   ├── audit/          — audit_log centralizado
│   ├── validations/    — schemas Zod compartilhados
│   └── utils/          — utilitários gerais
└── types/              — entidades de domínio e DTOs
```

---

## Telas Implementadas

### Autenticação (`/auth`)

| Rota | Descrição |
|---|---|
| `/login` | Login com e-mail + senha + Cloudflare Turnstile |
| `/register` | Cadastro de nova empresa — nome, e-mail, senha, nicho |
| `/mfa` | Verificação do código TOTP (6 dígitos) |
| `/mfa/setup` | Configuração obrigatória de 2FA para admin/owner |
| `/reset-password` | Solicitar link de recuperação de senha |
| `/update-password` | Definir nova senha via link do e-mail |

### Dashboard (`/dashboard`)

| Rota | Descrição |
|---|---|
| `/dashboard` | Home — métricas, resumo de atividade |
| `/chat` | Inbox de conversas WhatsApp |
| `/contacts` | Lista de leads e contatos |
| `/kanban` | Board de negociações (drag & drop) |
| `/analytics` | Dashboards e relatórios de performance |
| `/settings` | Configurações da conta e do workspace |

### Módulos por Nicho

| Rota | Nicho | Descrição |
|---|---|---|
| `/auto-parts` | Autopeças | Gestão de peças e cotações |
| `/auto-parts/quotes` | Autopeças | Cotações de peças |
| `/auto-sales` | Vendas de Veículos | Gestão de veículos |
| `/auto-sales/proposals` | Vendas de Veículos | Propostas de venda |
| `/fashion` | Moda | Catálogo de produtos |
| `/fashion/stock` | Moda | Controle de estoque |

### Admin (`/admin`)

| Rota | Descrição |
|---|---|
| `/admin` | Painel superadmin — visão geral |
| `/admin/workspaces` | Lista e gestão de workspaces (empresas) |
| `/admin/analytics` | Relatório de uso por workspace |

### Outras

| Rota | Descrição |
|---|---|
| `/` | Redirect para `/dashboard` ou `/login` |
| `/no-workspace` | Fallback — usuário sem workspace vinculado |

---

## Features Implementadas

### Multi-tenancy
- Isolamento total por `workspace_id` em todas as tabelas
- RLS ativo em todas as tabelas
- `workspace_id` derivado do contexto autenticado (nunca do cliente)

### Multi-nicho
- Cadastro com seleção de nicho obrigatória
- "Niche Setup Wall" — workspaces sem nicho são bloqueados até configuração
- Superadmin dispensa configuração de nicho
- Módulos de UI dinâmicos por nicho (autopeças, veículos, moda)
- Temas visuais por nicho via CSS variables

### Autenticação e Segurança
- Login com e-mail + senha
- 2FA obrigatório para admin/owner (TOTP via Supabase Auth)
- Rate limiting por IP e e-mail (login, registro, reset de senha)
- Cloudflare Turnstile (anti-bot) em todas as ações públicas
- Session timeout (inatividade + absoluto)
- Audit log para ações críticas (login, logout, 2FA, membros, workspace)
- Cookies HttpOnly + Secure + SameSite=Lax
- Headers de segurança: CSP, HSTS, X-Frame-Options, Permissions-Policy

### RBAC (Controle de Acesso)
- Roles padrão: owner, admin, vendedor
- Permissões granulares por workspace (workspace_roles + permissions)
- Fallback para matriz hardcoded quando sem RBAC configurado

### Admin (Superadmin)
- Listagem e gestão de todos os workspaces
- Impersonação de workspace (acesso sem credenciais)
- Relatório de uso agregado por workspace e drill-down de usuários
- Gestão de nichos (CRUD com hierarquia pai/filho)

### Settings
- Dados gerais do workspace
- Segmento/nicho com dropdowns dependentes (hierarquia N-nível)
- Perfil do usuário
- 2FA (ativar/desativar)
- Gestão de membros e permissões

### UI/UX
- Dark mode / Light mode com tokens CSS centralizados
- Skeleton loading em todas as listagens e dashboards
- Toasts com `toast.promise()` para ações assíncronas
- Animações com Framer Motion
- Layout responsivo (mobile + desktop)
- Sidebar colapsável

---

## Segurança — Status Atual

| Item | Status |
|---|---|
| RLS em todas as tabelas | ✅ |
| Rate limit (login, register, reset) | ✅ |
| Cloudflare Turnstile | ✅ |
| 2FA obrigatório para admin | ✅ |
| Audit log | ✅ |
| Headers de segurança (CSP, HSTS) | ✅ |
| Cookies seguros | ✅ |
| service_role isolado (nunca no cliente) | ✅ |
| Integração Z-API (WhatsApp real) | ⏳ Pendente |
| Webhooks (HMAC) | ⏳ Pendente |

---

## Variáveis de Ambiente Necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```
