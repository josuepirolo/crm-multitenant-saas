# Clean Architecture + MVVM

## Por quê

Separação total de responsabilidades evita:

- vazamento de queries Supabase na UI
- regras de negócio duplicadas em Server Actions e componentes
- impossibilidade de testar lógica sem React

## Fluxo de dependência

```
View (components/)
  ↓ props + callbacks
ViewModel (viewmodels/)
  ↓ chama UseCases / Server Actions expostas
UseCase (usecases/)
  ↓ chama Repositories
Repository (repositories/)
  ↓ acessa Supabase / APIs
Infra (lib/supabase/, lib/http/)
```

**Regra de ouro:** dependências apontam **para dentro**. UI nunca importa Repository.

## Camadas

### View — `src/components/[feature]/`
- Renderização e eventos
- Sem Supabase, sem regra de negócio
- Consome ViewModel ou props de Server Component

### ViewModel — `src/viewmodels/use[Nome]ViewModel.ts`
- Estado: loading, error, dados
- Handlers que chamam Server Actions ou UseCases (client)
- Transforma domínio → UI

### UseCase — `src/usecases/[Acao][Entidade]UseCase.ts`
- Um caso de uso por operação
- Orquestra repositórios + regras de negócio
- Agnóstico de React/Next

### Repository — `src/repositories/`
- Interface `I[Entidade]Repository`
- Implementação `Supabase[Entidade]Repository`
- Queries sempre escopadas (ex: `workspace_id`)

### Server Actions — `src/app/**/actions.ts`
- `"use server"`
- Auth + permissão **no início**
- Valida input (Zod)
- Chama UseCase — não query direta (exceto leituras RSC triviais documentadas)

## Nomenclatura

| Camada | Padrão | Exemplo |
|---|---|---|
| ViewModel | `use[Nome]ViewModel` | `useProfileViewModel` |
| UseCase | `[Acao][Entidade]UseCase` | `UpdateProfileUseCase` |
| Repository | `I*` / `Supabase*` | `IUserRepository` |
| DTO | `[Acao][Entidade]DTO` | `UpdateProfileDTO` |

## Plano antes de codar (LLM)

Para cada feature nova, listar:

1. Entidade / tipos em `src/types/`
2. Migration + RLS (se persistência)
3. Repository (interface + métodos)
4. UseCases (um por operação)
5. Server Actions + permissões
6. ViewModel (estado + handlers)
7. Componentes + estados loading/empty/error

## Anti-patterns

| ❌ | ✅ |
|---|---|
| `supabase.from()` em componente client | Server Action → UseCase → Repository |
| UseCase importando `toast` | ViewModel trata feedback UX |
| Server Action sem auth | `getUser()` / guard no topo |
| God file `actions.ts` 800 linhas | Split por feature |
