# Architecture Standards

## Princípio fundamental
Separação total de responsabilidades. Cada camada conhece apenas a camada imediatamente abaixo dela. UI não conhece banco de dados. Regras de negócio não conhecem framework.

## Clean Architecture — camadas

```
src/
├── app/                  # Camada de apresentação (Next.js, páginas, layouts)
├── components/           # Camada de UI (componentes visuais puros)
├── viewmodels/           # Camada MVVM (estado, lógica de apresentação)
├── usecases/             # Camada de casos de uso (regras de negócio)
├── repositories/         # Camada de acesso a dados (abstração do Supabase)
├── lib/supabase/         # Infraestrutura (implementação concreta do Supabase)
└── types/                # Tipos e entidades de domínio
```

## MVVM — responsabilidades

### View (components/)
- Apenas renderização e captura de eventos do usuário
- Não contém lógica de negócio, transformação de dados ou chamadas diretas ao Supabase
- Recebe dados e callbacks via props ou pelo ViewModel
- Exemplo: `LeadsTable`, `KanbanBoard`, `ChatMessage`

### ViewModel (viewmodels/)
- Estado local da tela (loading, error, dados exibidos)
- Transforma dados do domínio em formato exibível pela View
- Chama UseCases — nunca acessa repositórios diretamente
- Implementado como custom hook: `useLeadsViewModel`, `useKanbanViewModel`
- Exemplo:
  ```ts
  export function useLeadsViewModel() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    // chama usecase, transforma dados, expõe para a View
  }
  ```

### UseCase (usecases/)
- Uma classe ou função por caso de uso de negócio
- Orquestra repositórios, aplica regras de negócio, não conhece UI
- Exemplos: `CreateLeadUseCase`, `MoveKanbanCardUseCase`, `SendMessageUseCase`
- Sempre recebe dependências por injeção (repositório como parâmetro)

### Repository (repositories/)
- Interface + implementação separadas
- A interface define o contrato; a implementação usa Supabase
- Permite trocar o backend sem tocar em UseCase ou ViewModel
- Exemplo:
  ```ts
  // interface
  export interface ILeadRepository {
    findAll(workspaceId: string): Promise<Lead[]>;
    create(data: CreateLeadDTO): Promise<Lead>;
  }
  // implementação
  export class SupabaseLeadRepository implements ILeadRepository { ... }
  ```

## Regras de separação

- **Proibido** chamar Supabase diretamente em componentes ou páginas
- **Proibido** colocar lógica de negócio dentro de componentes React
- **Proibido** importar `repositories/` dentro de `components/`
- **Permitido** que Server Components chamem UseCases diretamente (sem ViewModel)
- **Permitido** que Route Handlers (API) chamem UseCases diretamente

## Fluxo de dados

```
View → ViewModel (hook) → UseCase → Repository → Supabase
                ↑                                      |
                └──────────── dados retornam ──────────┘
```

## Nomenclatura

| Camada | Sufixo | Exemplo |
|---|---|---|
| ViewModel | `use[Nome]ViewModel` | `useLeadsViewModel` |
| UseCase | `[Acao][Entidade]UseCase` | `CreateLeadUseCase` |
| Repository interface | `I[Entidade]Repository` | `ILeadRepository` |
| Repository impl | `Supabase[Entidade]Repository` | `SupabaseLeadRepository` |
| DTO | `[Acao][Entidade]DTO` | `CreateLeadDTO` |

## Entidades de domínio (types/)
- Tipos puros de TypeScript — sem dependência de Supabase ou framework
- Separar entidade de domínio do tipo retornado pelo Supabase (Database types)
- Exemplo: `Lead`, `Contact`, `Deal`, `Message`, `Workspace`

## Server Components vs Client Components
- **Server Components** — busca de dados inicial, SEO, sem interatividade
- **Client Components** (`"use client"`) — interatividade, realtime, ViewModel hooks
- Preferir Server Components para leitura; Client Components para mutações e estado
