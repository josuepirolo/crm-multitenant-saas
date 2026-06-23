# UI — Design system centralizado

## Princípios

1. **Uma fonte de verdade visual:** `src/app/globals.css` (tokens CSS)
2. **shadcn = comportamento**, aparência 100% do projeto
3. **Componentes shared** reutilizáveis — zero copy-paste de empty state
4. **Modular por feature** — `components/[feature]/` + `components/shared/`

## Artefatos recomendados

| Arquivo | Conteúdo |
|---|---|
| `docs/brand.md` | Paleta, tipografia, tom |
| `docs/design-system.md` | Variantes de Button, Card, Input |
| `docs/screens.md` | Mapa de telas e fluxos |
| `src/app/globals.css` | `--bg-*`, `--text-*`, `--radius-*`, `--text-xs`… |

## Hierarquia de componentes

```
components/ui/          → primitivos (Button, Input) — shadcn customizado
components/shared/      → EmptyState, PageHeader, ConfirmDialog
components/[feature]/   → específicos da feature
```

## i18n (PT / EN / ES)

- Strings de UI via `next-intl` ou dicionários em `src/i18n/{pt,en,es}.json`
- Tokens visuais **não** traduzem — só texto
- Ver `../i18n/README.md`

## Referências

- `tokens-and-globals.md`
- `component-states.md`
- `folder-structure.md`
- `../skills/claude/ui-execution-rules/SKILL.md`
