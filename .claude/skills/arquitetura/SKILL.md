---
name: arquitetura
description: Guia de arquitetura Clean Architecture + MVVM do CRM Vendas WhatsApp. OBRIGATÓRIO antes de qualquer código — sem exceção. Ative sempre que o usuário pedir para criar ou alterar módulo, feature, página, componente, Server Action, repositório, usecase ou viewmodel. Também ative em revisões, refatorações e auditorias. Gere sempre um plano estruturado por camadas antes de escrever qualquer linha. Esta skill deve ser a primeira a ser carregada em toda sessão de implementação.
---

# Skill: Arquitetura CRM Vendas WhatsApp

Este projeto segue **Clean Architecture + MVVM** com separação total de responsabilidades. Antes de escrever qualquer código, produza um plano explícito mostrando como cada camada será implementada.

## Stack do projeto
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS + tokens CSS (sem hardcode)
- **Componentes:** shadcn/ui + Radix UI
- **Backend/DB:** Supabase (PostgreSQL + RLS + Realtime)
- **Auth:** Supabase Auth com `@supabase/ssr`
- **Formulários:** React Hook Form + Zod
- **Animações:** Framer Motion

## Camadas e responsabilidades

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

### View — `src/components/[feature]/`
- Renderização e captura de eventos
- Sem lógica de negócio, sem chamadas ao Supabase
- Recebe tudo via props ou ViewModel

### ViewModel — `src/viewmodels/use[Nome]ViewModel.ts`
- Estado local: loading, error, dados exibidos
- Transforma dados do domínio para exibição
- Chama UseCases — nunca acessa repositórios diretamente

### UseCase — `src/usecases/[Acao][Entidade]UseCase.ts`
- Uma classe ou função por caso de uso
- Orquestra repositórios, aplica regras de negócio
- Não conhece UI nem framework

### Repository — `src/repositories/[entidade].repository.ts`
- Interface `I[Entidade]Repository` + implementação `Supabase[Entidade]Repository`
- Toda query filtra por `workspace_id`
- Nunca chamado diretamente de componentes

### Server Actions — `src/app/(dashboard)/[feature]/actions.ts`
- Verifica permissão com `requirePermission()` antes de qualquer operação
- Chama UseCases — nunca acessa o banco diretamente
- Revalida cache com `revalidatePath()` após mutações

## Nomenclatura obrigatória

| Camada | Padrão | Exemplo |
|---|---|---|
| ViewModel | `use[Nome]ViewModel` | `useKanbanViewModel` |
| UseCase | `[Acao][Entidade]UseCase` | `CreateDealUseCase` |
| Repository interface | `I[Entidade]Repository` | `IDealRepository` |
| Repository impl | `Supabase[Entidade]Repository` | `SupabaseDealRepository` |
| DTO | `[Acao][Entidade]DTO` | `CreateDealDTO` |
| Componente | PascalCase | `KanbanBoard`, `DealCard` |

## Como produzir o plano antes de codar

Para **novo módulo ou feature**, liste:

1. **Entidade de domínio** — campos e tipo em `src/types/index.ts`
2. **Migration Supabase** — tabela, colunas, RLS policies, índices
3. **Repository** — interface + métodos necessários
4. **UseCases** — um por operação (listar, criar, editar, deletar, etc.)
5. **Server Actions** — quais actions e qual permissão cada uma exige
6. **ViewModel** — estado, handlers, dados expostos para a View
7. **Componentes** — quais criar, props de cada um, estados (loading, empty, error)
8. **Validação Zod** — schema compartilhado entre frontend e backend
9. **UI** — skeleton loading, toasts, animações, responsividade

Para **revisão de código existente**, verifique:

- [ ] Supabase é chamado apenas em repositórios?
- [ ] Componentes recebem apenas dados via props/ViewModel?
- [ ] UseCases não importam nada de `components/` ou `app/`?
- [ ] Toda query filtra por `workspace_id`?
- [ ] Server Actions verificam permissão antes de operar?
- [ ] Inputs validados com Zod no servidor?
- [ ] Nenhuma cor hardcoded (apenas tokens CSS)?
- [ ] Skeleton loading implementado?
- [ ] Dark mode funcional?

## Regras invioláveis

- **Proibido** chamar Supabase em componentes ou páginas
- **Proibido** lógica de negócio em componentes React
- **Proibido** importar `repositories/` dentro de `components/`
- **Proibido** cores Tailwind literais (`gray-*`, `white`, `black`) — use tokens
- **Proibido** `workspace_id` vindo do cliente — sempre do contexto autenticado
- **Permitido** Server Components chamarem UseCases diretamente (sem ViewModel)
- **Permitido** Route Handlers chamarem UseCases diretamente

## Segurança (checklist antes de entregar)

- [ ] RLS ativo na tabela envolvida
- [ ] Toda query filtra por `workspace_id`
- [ ] `service_role` apenas em Route Handlers — nunca no cliente
- [ ] Cookies de sessão: HttpOnly + Secure + SameSite=Lax
- [ ] Nenhum token em localStorage

## UI (checklist antes de entregar)

- [ ] Apenas tokens CSS (`bg-background`, `text-foreground`, etc.)
- [ ] Skeleton loading implementado
- [ ] Estados: loading, empty, error implementados
- [ ] Dark mode testado
- [ ] Toasts com `toast.promise()` para ações assíncronas
- [ ] Layout responsivo (mobile 375px + desktop 1280px+)
- [ ] Animações via Framer Motion (200-350ms, ease-out)
