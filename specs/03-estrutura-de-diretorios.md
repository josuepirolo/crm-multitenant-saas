# 03 — Estrutura de Diretórios

## Raiz do projeto

```
/
├── src/                    — código da aplicação
├── supabase/               — migrations e config do banco
├── scripts/                — scripts de utilidade (ex: create-tenant.mjs)
├── specs/                  — esta documentação
├── docs/security/          — documentação de segurança
├── patches/                — patches de pacotes (patch-package)
├── public/                 — assets estáticos
├── .sdds/                  — estado e memória do projeto (SDDS framework)
├── .claude/                — configuração e skills do Claude Code
├── CLAUDE.md               — instruções para o assistente de IA
├── PROJECT.md              — documentação do projeto (banco, decisões, telas)
├── package.json
└── tsconfig.json
```

## `src/app/` — Rotas (Next.js App Router)

```
src/app/
├── (auth)/                 — grupo de rotas públicas de autenticação
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── mfa/page.tsx
│   ├── mfa/setup/page.tsx
│   ├── reset-password/page.tsx
│   ├── update-password/page.tsx
│   └── actions.ts          — Server Actions de auth
│
├── (dashboard)/            — grupo de rotas autenticadas (área do usuário)
│   ├── layout.tsx          — sidebar, header, guard de autenticação
│   ├── dashboard/page.tsx
│   ├── contacts/
│   ├── kanban/
│   ├── analytics/
│   ├── chat/               — PLACEHOLDER VAZIO (aguarda WA integrations)
│   ├── settings/
│   ├── auto-parts/
│   ├── auto-sales/
│   ├── fashion/
│   └── actions.ts          — Server Actions compartilhadas do dashboard
│
├── (admin)/                — grupo de rotas do superadmin
│   └── admin/
│
├── api/
│   ├── address/cep/route.ts — proxy ViaCEP (rate limited)
│   └── auth/callback/route.ts — callback OAuth do Supabase
│
├── auth/callback/          — rota de callback após login Supabase
├── no-workspace/page.tsx   — fallback para usuário sem workspace
├── layout.tsx              — root layout (providers, tema)
└── page.tsx                — redirect para /dashboard ou /login
```

> **Regra:** `actions.ts` fica sempre no mesmo diretório da rota que o usa. Nunca centralizar Server Actions em um único arquivo global.

## `src/components/` — Camada View

```
src/components/
├── ui/                     — primitivos base (shadcn/ui + customizados)
│   ├── button.tsx, input.tsx, dialog.tsx, etc.
│
├── auth/                   — forms e UI de autenticação
├── contacts/               — tabela, filtros, drawer de contato
├── kanban/                 — board, card, colunas, drag overlay
├── settings/               — abas de settings (workspace, membros, nicho, etc.)
├── admin/                  — UI do painel superadmin
├── dashboard/              — cards de métricas, gráficos
├── analytics/              — UI de analytics
├── auto-parts/             — catálogo, cotações
├── auto-sales/             — inventário, propostas
├── fashion/                — produtos, variantes, estoque
└── chat/                   — PLACEHOLDER (sem implementação real)
```

> **Regra:** componente em `ui/` é genérico e reutilizável. Componente em `[feature]/` é específico de domínio. Nunca colocar lógica de negócio em componente.

## `src/viewmodels/` — Camada ViewModel

```
src/viewmodels/
├── useContactsViewModel.ts
├── useKanbanViewModel.ts
├── useSettingsViewModel.ts
├── useAdminViewModel.ts
└── usePermissions.ts
```

Custom hooks que gerenciam estado e chamam UseCases. Não acessam repositórios diretamente.

## `src/usecases/` — Camada UseCase

```
src/usecases/
├── ContactUseCases.ts
├── KanbanUseCases.ts
├── WorkspaceUseCases.ts
├── WorkspaceProfileUseCases.ts
├── MemberUseCases.ts
├── RbacUseCases.ts
├── NicheUseCases.ts
├── AdminUseCases.ts
├── AutoPartsUseCases.ts
├── AutoSalesUseCases.ts
├── FashionUseCases.ts
├── VehicleCatalogUseCases.ts
└── GetDashboardStatsUseCase.ts
```

## `src/repositories/` — Camada Repository

```
src/repositories/
├── contact.repository.ts
├── deal.repository.ts
├── member.repository.ts
├── workspace.repository.ts
├── rbac.repository.ts
├── niche.repository.ts
├── dashboard.repository.ts
├── admin.repository.ts
├── auto-parts.repository.ts
├── auto-sales.repository.ts
├── fashion.repository.ts
└── vehicle-catalog.repository.ts
```

> **Ponto em aberto:** sem interfaces (`IContactRepository`) — repositórios são classes concretas. Dificulta mock em testes de UseCase isolados.

## `src/lib/` — Infraestrutura e utilitários

```
src/lib/
├── supabase/
│   ├── client.ts           — createBrowserClient (anon key)
│   ├── server.ts           — createServerClient (anon key)
│   ├── admin.ts            — createAdminClient (service_role — apenas server)
│   ├── middleware.ts       — renovação de sessão
│   └── cached-auth.ts     — cache de auth no servidor
│
├── security/
│   ├── rate-limit.ts       — rate limiting por IP e email
│   ├── client-ip.ts        — extração do IP do cliente
│   ├── security-errors.ts  — erros genéricos (sem vazar detalhes)
│   ├── session-policy.ts   — política de sessão (timeout, inatividade)
│   └── turnstile.ts        — validação Cloudflare Turnstile
│
├── audit/
│   └── audit-log.ts        — helper centralizado de audit_log
│
├── validations/
│   ├── auth.ts             — schemas Zod de autenticação
│   ├── contact.ts          — schema Zod de contato
│   ├── deal.ts             — schema Zod de deal
│   ├── workspace.ts        — schema Zod de workspace
│   └── document.ts         — validação CPF/CNPJ
│
├── analytics/
│   └── normalize-path.ts  — normaliza URLs para tracking de área
│
├── themes/
│   └── niche-themes.ts     — temas visuais por nicho (CSS vars)
│
├── constants/
│   └── contact-status.ts
│
├── guards.ts               — getWorkspaceContext, requireSuperAdmin
├── workspace-context.ts    — extração de contexto do workspace
├── permissions.ts          — matriz de permissões RBAC
├── user-role.ts            — utilitários de role
├── impersonation.ts        — lógica de impersonation (superadmin)
└── utils.ts / utils/slug.ts
```

## `src/types/` — Entidades de domínio

```
src/types/
└── index.ts                — Workspace, Profile, WorkspaceMember, ContactStatus, DealStatus, etc.
```

## `src/tests/` — Testes

```
src/tests/
├── security/               — rate limit, audit log, headers, hardening, impersonation
├── tenant-isolation/       — RLS, workspace_id, cross-tenant bloqueado
├── integration/            — testes com Supabase real (RLS autenticado)
├── unit/                   — validações, temas
└── helpers/                — mocks e setup
```

## `supabase/migrations/` — Banco de dados

34 arquivos `.sql` em ordem cronológica. Ver `04-modelagem-e-dados.md` para detalhes.

## O que evitar em cada camada

| Pasta | O que NÃO colocar |
|---|---|
| `components/` | Chamadas ao Supabase, regras de negócio, lógica de estado complexa |
| `viewmodels/` | Acesso direto a repositórios, chamadas ao Supabase |
| `usecases/` | Imports de componentes React, lógica de apresentação |
| `repositories/` | Lógica de negócio, validações de domínio |
| `lib/supabase/admin.ts` | Qualquer uso em fluxo de usuário comum |
