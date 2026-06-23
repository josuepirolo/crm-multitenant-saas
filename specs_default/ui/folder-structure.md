# UI — Pastas e modularização

```
src/components/
├── ui/                 # Button, Input, Dialog — base shadcn customizada
├── shared/             # cross-feature
│   ├── EmptyState.tsx
│   ├── PageHeader.tsx
│   ├── LoadingSkeleton.tsx
│   └── ErrorBanner.tsx
└── [feature]/          # ex: settings/, billing/
    ├── feature-client.tsx    # "use client" + ViewModel
    ├── feature-form.tsx
    └── feature-list.tsx
```

## Convenções

| Tipo | Sufixo | Exemplo |
|---|---|---|
| Client orchestrator | `*-client.tsx` | `SettingsClient` |
| Sheet/Dialog | `*-sheet.tsx` | `EditProfileSheet` |
| Lista | `*-list.tsx` | `InvoiceList` |

## Server vs Client

- `page.tsx` — RSC, fetch inicial mínimo
- `*-client.tsx` — interatividade + ViewModel
- Não marcar `"use client"` na árvore inteira se 80% é estático

## Composição

- Extrair subcomponentes **fora** do render (não definir componente dentro de componente)
- Props explícitas — evitar prop drilling profundo (context só cross-cutting)

## Design system doc

Cada primitivo em `ui/` documentado em `docs/design-system.md`:

- variantes (primary, ghost, destructive)
- todos os estados
- exemplo de uso
