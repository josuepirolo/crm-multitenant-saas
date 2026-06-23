# Estados obrigatórios de componentes

Todo componente interativo ou lista de dados implementa:

```
Default → Hover → Active → Focus-visible → Disabled → Loading → Error → Empty
```

## Loading

- Skeleton shimmer para listas/cards
- Spinner inline em botões (`disabled` + aria-busy)
- Nunca tela branca

## Empty

```tsx
// components/shared/EmptyState.tsx — padrão
<EmptyState
  icon={Inbox}
  title="Nenhum item ainda"
  description="Crie o primeiro para começar."
  action={{ label: "Criar", onClick: ... }}
/>
```

## Error

- Mensagem **acionável** ("Tente novamente", "Verificar conexão")
- Nunca stack trace na UI
- `role="alert"` quando crítico

## Focus

- `:focus-visible` global no globals.css
- Nunca remover outline sem substituto

## Responsivo

- Testar 375px e 1440px antes de entregar
- Touch targets ≥ 44px em mobile

## Checklist LLM (autoavaliação)

1. Parece template shadcn genérico?
2. Loading/empty/error existem?
3. Hover/focus visíveis?
4. Só tokens CSS?
