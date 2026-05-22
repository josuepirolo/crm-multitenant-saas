# 08 — Padrões de Código

## Nomenclatura

| Camada | Padrão | Exemplo |
|---|---|---|
| ViewModel | `use[Nome]ViewModel` | `useContactsViewModel` |
| UseCase | `[Dominio]UseCases` | `ContactUseCases`, `KanbanUseCases` |
| Repository | `[entidade].repository.ts` | `contact.repository.ts` |
| Server Action | `actions.ts` no diretório da rota | `(dashboard)/contacts/actions.ts` |
| Route Handler | `route.ts` no diretório da API | `api/address/cep/route.ts` |
| Componente de feature | `[Nome]Client` ou `[Nome]Table` | `contacts-client.tsx`, `KanbanBoard` |
| Tipos / entidades | PascalCase | `Workspace`, `Contact`, `Deal` |
| Hooks utilitários | `use[Nome]` | `usePermissions` |

## Organização de arquivos por feature

Toda feature tem seus arquivos agrupados:
```
(dashboard)/contacts/
├── page.tsx              — Server Component (leitura inicial)
├── contacts-client.tsx   — Client Component (interatividade)
└── actions.ts            — Server Actions (mutações)
```

Componentes de UI ficam em `src/components/[feature]/`.
ViewModels ficam em `src/viewmodels/`.

## Server Actions — regras

1. Toda Server Action começa com `"use server"`
2. Sempre validar input com Zod antes de qualquer operação
3. Sempre chamar `getWorkspaceContext(supabase)` para obter `workspace_id`
4. Nunca confiar em `workspace_id` vindo do formulário/cliente
5. Erros retornam `{ error: string }` — nunca lançam exceção ao cliente
6. Mensagens de erro são genéricas para o usuário; detalhes ficam no log do servidor
7. Audit log nas ações críticas

## Componentes React — regras

- Server Components: leitura de dados, sem `useState` ou `useEffect`
- Client Components: precisam de `"use client"` no topo; usam ViewModels
- Componentes não chamam Supabase diretamente — nunca
- Props tipadas com TypeScript — sem `any`
- Eventos de UX disparam ViewModel; ViewModel dispara UseCase

## Validações com Zod

Schemas centralizados em `src/lib/validations/`:
- `auth.ts` — login, register, reset
- `contact.ts` — criação e edição de contato
- `deal.ts` — criação e edição de deal
- `workspace.ts` — dados do workspace
- `document.ts` — CPF e CNPJ (algoritmo da Receita Federal)

**Regra:** validar no cliente (UX) E no servidor (segurança). Nunca só no cliente.

## Tratamento de erros

Server Actions retornam:
```typescript
// sucesso
return { data: resultado }

// erro
return { error: "Mensagem genérica para o usuário" }
// detalhe do erro vai para console.error (servidor), nunca para o cliente
```

Componentes exibem o erro via toast Sonner:
```typescript
toast.error(result.error ?? "Erro inesperado")
```

Para ações assíncronas com loading:
```typescript
toast.promise(minhaAction(), {
  loading: "Salvando...",
  success: "Salvo com sucesso!",
  error: "Erro ao salvar"
})
```

## Design System

- Cores: sempre via CSS tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, etc.)
- **Proibido:** cores Tailwind literais em componentes (`bg-white`, `text-gray-900`, `bg-gray-100`)
- Tokens definidos em `src/app/globals.css` (`:root` light + `.dark`)
- Dark mode: `class` strategy do Tailwind, gerenciado pelo `next-themes`
- Componentes base: `src/components/ui/` — não modificar sem necessidade
- Animações: Framer Motion (`framer-motion`) — `200ms` micro-interações, `350ms` transições

## Padrão de loading / skeleton

- Toda listagem tem skeleton correspondente
- Skeleton usa `animate-pulse` com `bg-muted`
- `loading.tsx` no diretório da rota para Suspense automático do Next.js

## Banco de dados — regras no código

- Toda query filtra por `workspace_id`
- Usar server client (`createServerClient`) no servidor
- Usar browser client (`createBrowserClient`) apenas em Client Components que precisam de Realtime
- `createAdminClient()` apenas em operações admin explicitamente justificadas
- Queries com Supabase sempre tipadas — usar tipos gerados ou `Database` do Supabase

## Testes

Suíte organizada em `src/tests/`:

| Diretório | O que testa |
|---|---|
| `security/` | Rate limit, audit log, headers, hardening, impersonation |
| `tenant-isolation/` | RLS por workspace, bloqueio cross-tenant |
| `integration/` | Supabase real com usuários autenticados |
| `unit/` | Validações (CPF/CNPJ), temas por nicho |

Runner: Vitest (`npm test`)

**Regra:** não mockar o banco em testes de isolamento — usar banco real para garantir que RLS funciona.

## Como criar uma nova feature

1. Criar migration SQL em `supabase/migrations/` se precisar de tabela nova
2. Criar tipos em `src/types/index.ts`
3. Criar Repository em `src/repositories/[entidade].repository.ts`
4. Criar UseCase em `src/usecases/[Dominio]UseCases.ts`
5. Criar ViewModel em `src/viewmodels/use[Nome]ViewModel.ts` (se Client)
6. Criar Server Actions em `src/app/(dashboard)/[feature]/actions.ts`
7. Criar Server Component (page) em `src/app/(dashboard)/[feature]/page.tsx`
8. Criar Client Component em `src/components/[feature]/` e `src/app/(dashboard)/[feature]/[feature]-client.tsx`
9. Adicionar testes de isolamento de tenant em `src/tests/tenant-isolation/`

## Regras para LLMs que vão continuar este projeto

- Nunca chamar Supabase em componentes React — usar Server Actions ou UseCase via ViewModel
- Nunca usar `workspace_id` do formulário — sempre de `getWorkspaceContext()`
- Nunca usar `createAdminClient()` em fluxo de usuário comum
- Nunca colocar lógica de negócio em `actions.ts` — isso vai no UseCase
- Nunca criar arquivo fora da estrutura definida acima sem justificativa em ADR
- Cores via tokens CSS, não literais Tailwind
- Erros genéricos para o usuário, detalhes no console.error
