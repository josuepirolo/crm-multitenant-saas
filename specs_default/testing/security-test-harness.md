# Harness — testes de segurança

## Objetivo

Suite mínima que **deve passar** antes de merge em áreas sensíveis.

## Estrutura sugerida

```
src/tests/security/
├── auth-required.test.ts       # Server Actions rejeitam sem sessão
├── tenant-isolation.test.ts    # user A não lê dados workspace B
├── rls-policies.test.ts        # policies existem e bloqueiam
├── env-exposure.test.ts        # grep: no service_role in client bundle
└── impersonation.test.ts       # se feature existir
```

## Casos obrigatórios (multi-tenant)

1. **Unauthenticated** → action retorna erro / redirect
2. **Cross-tenant read** → 403 ou empty (RLS)
3. **Cross-tenant write** → falha WITH CHECK
4. **IDOR** → id de outro workspace não atualiza

## RLS

Testar com client `authenticated` role simulado — não só service_role.

## Comando

```json
{
  "scripts": {
    "test:security": "vitest run src/tests/security"
  }
}
```

## CI

Bloquear merge se `test:security` falhar.

## Expandir

Ver skill `security-tests` no projeto origem para prompts de geração de casos.
