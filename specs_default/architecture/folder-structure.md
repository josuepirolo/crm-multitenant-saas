# Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/              # login, register, reset — layout público
│   ├── (dashboard)/         # rotas autenticadas
│   │   ├── layout.tsx       # shell + SessionTimer se aplicável
│   │   └── [feature]/
│   │       ├── page.tsx     # RSC — fetch leve ou delega a client
│   │       └── actions.ts   # Server Actions da feature
│   ├── api/                 # Route Handlers (webhooks, integrações)
│   ├── globals.css          # tokens CSS — fonte de verdade visual
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn base — estilos sobrescritos
│   ├── shared/              # EmptyState, PageHeader, DataTable shell
│   └── [feature]/           # componentes da feature
├── viewmodels/
├── usecases/
├── repositories/
├── lib/
│   ├── supabase/            # client server/browser/middleware
│   ├── guards.ts            # auth, workspace, permissões
│   ├── validations/         # schemas Zod
│   └── security/            # rate limit, session policy, errors
├── types/
└── tests/
    └── security/

docs/                        # brand.md, design-system.md, screens.md (opcional D0)
specs_default/               # este pacote (ou copiado do template)
supabase/migrations/         # DDL versionado
```

## Route groups

| Grupo | Propósito |
|---|---|
| `(auth)` | Sem sidebar; redirect se já logado |
| `(dashboard)` | Middleware exige sessão |
| `(admin)` | Superadmin — guard extra |

## Onde NÃO colocar código

| Local | Motivo |
|---|---|
| `components/` com fetch Supabase | Viola MVVM |
| `lib/` com JSX | Mistura concerns |
| `.env` no git | Vazamento de secrets |
| SQL solto em prod | Sem rastro / drift |

## Modularização por feature

Cada feature nova deve poder localizar:

- `components/[feature]/`
- `viewmodels/use[Feature]ViewModel.ts`
- `usecases/*[Feature]*`
- `repositories/[feature].repository.ts`
- `app/(dashboard)/[feature]/`

Cross-cutting (`shared/`, `ui/`, `lib/guards`) não importa feature específica.
