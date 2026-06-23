# CI mínimo

Pipeline obrigatório em PR para `main` / `dev`:

```yaml
# Exemplo conceitual — adaptar ao host (GitHub Actions, etc.)
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run test:security   # ver testing/security-test-harness.md
```

## Opcional (recomendado staging)

- `npm audit --audit-level=high`
- Playwright smoke (login + dashboard)
- Supabase migration dry-run

## Deploy

- Secrets só no environment do host
- Preview deployments com Supabase project separado (ideal)
