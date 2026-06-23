# Regras de import entre camadas

## Matriz permitida

| De \ Para | View | ViewModel | UseCase | Repository | lib/supabase |
|---|---|---|---|---|---|
| **View** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ViewModel** | ❌ | — | ✅ (via action) | ❌ | ❌ |
| **UseCase** | ❌ | ❌ | — | ✅ | ❌ (via repo) |
| **Repository** | ❌ | ❌ | ❌ | — | ✅ |
| **Server Action** | ❌ | ❌ | ✅ | ❌* | ❌* |

\* Server Action **nunca** importa Repository diretamente — sempre UseCase.

## Imports proibidos (ESLint recomendado)

```js
// Exemplo: banir createClient de supabase/server em components
{
  files: ["src/components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@/lib/supabase/server",
        message: "Supabase server só em Server Actions / RSC / repositories.",
      }],
    }],
  },
}
```

## Server vs Client

| Arquivo | Diretiva |
|---|---|
| Componente interativo | `"use client"` |
| Server Action | `"use server"` |
| Repository / UseCase | sem diretiva (server-only por import chain) |
| Tipos puros | importável anywhere |

## Por quê

Quebrar estas regras leva a:

- secrets no bundle client
- RLS bypass acidental
- testes impossíveis
- refactors caros
