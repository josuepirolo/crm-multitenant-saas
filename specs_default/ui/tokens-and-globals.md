# Tokens CSS — globals.css

## Estrutura mínima

```css
:root {
  /* Backgrounds */
  --bg-primary: ...;
  --bg-secondary: ...;
  --bg-muted: ...;

  /* Text */
  --text-primary: ...;
  --text-secondary: ...;
  --text-muted: ...;

  /* Semantic */
  --color-success: ...;
  --color-warning: ...;
  --color-error: ...;
  --color-primary: ...;

  /* Border & radius */
  --border: ...;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* Typography scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}

.dark {
  /* overrides */
}
```

## Regras

| ❌ | ✅ |
|---|---|
| `#1a1a1a` no JSX | `var(--bg-primary)` |
| `text-gray-500` | `text-[var(--text-muted)]` ou classe utilitária do projeto |
| Tamanho `text-[17px]` ad hoc | escala `--text-*` |

## Tailwind + tokens

Configurar `tailwind.config` para mapear cores semânticas → CSS variables quando possível.

## Dark mode

- Preferir class `.dark` no `<html>`
- Mesmos nomes de token — valores diferentes no bloco `.dark`

## Antes de adicionar cor nova

1. Existe token semântico? (success/warning/error)
2. Se não, adicionar em `:root` + documentar em `docs/design-system.md`
