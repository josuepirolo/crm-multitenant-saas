# ESLint — guardrails mínimos

## Base

```js
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
```

## Regras recomendadas

### 1. Banir Supabase server em components

```js
{
  files: ["src/components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@/lib/supabase/server",
        message: "Use Server Actions — não Supabase direto na View.",
      }],
    }],
  },
}
```

### 2. Banir service_role import paths

Documentar exceções com `eslint-disable-next-line` + comentário justificando.

### 3. TypeScript strict

`tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true` (recomendado)

## Pre-commit

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

## CI

```bash
npx tsc --noEmit
npx eslint "src/**/*.{ts,tsx}"
```

Falha = merge bloqueado.
