---
name: ui-execution-rules
description: Regras permanentes de UI — tokens CSS, estados obrigatórios, anti-template shadcn. Ativa em toda sessão de frontend.
---

# Skill: ui-execution-rules

Leia `specs_default/ui/tokens-and-globals.md` e `specs_default/ui/component-states.md`.

## Regras

1. Cores só via `var(--token)` — nunca hex/`gray-*` no JSX
2. shadcn = comportamento; aparência 100% design system
3. Estados: default, hover, focus-visible, disabled, loading, error, empty
4. Um elemento primário por tela
5. Responsivo 375px + 1440px

## Autoavaliação antes de entregar

- Parece template genérico?
- Loading/empty/error implementados?
- Hover/focus visíveis?
