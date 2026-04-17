# CLAUDE.md

## Projeto
**CRM Vendas WhatsApp** — plataforma SaaS para gestão de vendas via WhatsApp. Permite gerenciar leads, contatos, conversas, funis de vendas e análise de performance. Público-alvo: empresas e equipes de vendas que usam WhatsApp como canal principal.

## Stack
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS
- **Componentes:** shadcn/ui + Radix UI
- **Backend/DB:** Supabase (PostgreSQL + Realtime + Storage)
- **Autenticação:** Supabase Auth
- **Formulários:** React Hook Form + Zod
- **Animações:** Framer Motion

## Funcionalidades principais
- Bate-papo WhatsApp integrado (inbox de conversas)
- Gestão de leads e contatos
- Kanban de negociações
- Funis de vendas personalizáveis
- Dashboards e analytics
- Multi-tenant (SaaS — cada empresa é um workspace isolado)

## Estrutura de pastas relevante
```
src/
├── app/                  # rotas Next.js (App Router)
│   ├── (auth)/           # login, registro, recuperação de senha
│   ├── (dashboard)/      # área autenticada
│   └── api/              # route handlers
├── components/
│   ├── ui/               # componentes base (shadcn/ui)
│   └── [feature]/        # componentes por funcionalidade
├── hooks/                # custom hooks
├── lib/
│   ├── supabase/         # cliente e helpers do Supabase
│   └── utils/            # utilitários gerais
└── types/                # tipos TypeScript globais
```

## Comandos essenciais
- `npm run dev`       — inicia o servidor de desenvolvimento
- `npm run build`     — build de produção
- `npm run lint`      — verifica lint
- `npm run typecheck` — verifica tipos TypeScript

## Convenções do projeto
- Nomenclatura: PascalCase para componentes, camelCase para hooks e utilitários
- Imports absolutos a partir de `src/`
- Commits em português no padrão Conventional Commits (feat:, fix:, chore:, etc.)
- Nunca commitar direto na `main`
- Cada workspace (empresa) é isolado via `workspace_id` em todas as tabelas

## Contexto adicional
- Produto SaaS multi-tenant — segurança e isolamento de dados entre workspaces é prioridade
- Supabase Realtime para atualização ao vivo das conversas e kanban
- Foco em visual de alta qualidade — dashboards ricos, UI moderna e responsiva

@import .claude/rules/ui-design.md
@import .claude/rules/security.md
