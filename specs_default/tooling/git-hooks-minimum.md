# Git hooks — mínimo

## Pre-commit

1. `eslint` nos arquivos staged
2. `tsc --noEmit` (ou só em CI se lento)
3. Bloquear stage de:
   - `.env`, `.env.local`, `.env.production`
   - `*.pem`, `credentials.json`
   - arquivos > limite (opcional)

## Exemplo Husky

```bash
#!/bin/sh
npm run lint-staged
```

## Pre-push (opcional)

- `vitest run src/tests/security`

## Nunca

- `--no-verify` em commit de auth/RLS/migrations
- `--force` push main/master

## Secret scanning

- GitHub secret scanning / gitleaks em CI recomendado
