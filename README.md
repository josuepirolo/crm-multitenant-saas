# CRM Vendas WhatsApp

SaaS multi-tenant para gestão de vendas com foco em WhatsApp: leads/contatos, equipe por workspace, dashboard e base preparada para inbox e integrações.

## Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript  
- **UI:** Tailwind CSS, shadcn/ui, Radix, Framer Motion  
- **Dados / auth:** Supabase (PostgreSQL, RLS, Auth, Storage)  
- **Formulários:** React Hook Form + Zod  
- **Testes:** Vitest  

Versões exatas: veja `package.json`.

## Documentação no repositório

| Documento | Conteúdo |
|-----------|----------|
| [`CLAUDE.md`](CLAUDE.md) | Visão do produto, estrutura de pastas, skills do assistente, comandos |
| [`.claude/checklist.md`](.claude/checklist.md) | Checklist macro de features (o que está feito / pendente) |
| [`docs/security.md`](docs/security.md) | Rate limit, auditoria, headers, CSP, hardening de erros |
| [`docs/security/rbac.md`](docs/security/rbac.md) | Modelo RBAC por workspace |
| [`docs/settings-admin.md`](docs/settings-admin.md) | Settings, convite de membros, painel super-admin |
| [`.claude/supabase-production-checklist.md`](.claude/supabase-production-checklist.md) | SMTP, URLs, RLS e secrets antes de produção |

Regras detalhadas de arquitetura, UI e segurança estão em `.claude/rules/` (referenciadas pelo `CLAUDE.md`).

## Estrutura (resumo)

```
src/
├── app/           # Rotas App Router — (auth), (dashboard), (admin), api/
├── components/    # UI por feature + components/ui (design system)
├── viewmodels/    # Hooks MVVM
├── usecases/      # Casos de uso
├── repositories/  # Acesso a dados (Supabase)
├── lib/           # Supabase, security, audit, validações, guards
└── types/         # Tipos de domínio
```

## Primeiros passos

```bash
npm install
cp .env.example .env.local   # se existir; preencher variáveis Supabase e demais
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor após build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emit |
| `npm test` | Vitest (uma execução) |
| `npm run test:watch` | Vitest em modo watch |

## Estado atual do produto (alto nível)

Implementado com mais profundidade: autenticação (incl. Turnstile com reset automático após falha, mensagens específicas por tipo de erro), dashboard com métricas e gráficos, **módulo de contatos** (incl. carteira de clientes: assigned_to por responsável, compartilhamento pontual via contact_access, RLS por portfolio e filtro de responsável para gestores), **configurações do workspace** (empresa, membros, perfil do usuário com avatar, MFA na UI conforme `settings`), **RBAC**, **painel super-admin**, camadas de **rate limit**, **auditoria** e **headers de segurança** descritas em `docs/security.md`.

Ainda em estágio inicial (placeholders ou não iniciado): **Kanban**, **inbox/chat WhatsApp**, integração **Z-API** / webhooks, **analytics** avançado — ver `.claude/checklist.md`.

Após mudanças relevantes, rode `npm test` e `npm run typecheck` antes de commitar; a suíte de testes evolui junto com o código.

## Licença

Projeto privado (`private: true` no `package.json`).
