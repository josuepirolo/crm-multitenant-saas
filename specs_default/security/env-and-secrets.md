# Variáveis de ambiente e segredos

## Regra de ouro

> **`NEXT_PUBLIC_*` = visível no bundle do browser. Sem exceção.**

## Permitido em NEXT_PUBLIC_

```
NEXT_PUBLIC_APP_URL=https://app.exemplo.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # projetada para RLS — não é secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...     # site key pública
```

## NUNCA em NEXT_PUBLIC_

```
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
STRIPE_SECRET_KEY
WEBHOOK_HMAC_SECRET
JWT_SIGNING_SECRET
API keys privadas de terceiros
```

## Server-only (sem prefixo ou sem NEXT_PUBLIC)

```
SUPABASE_SERVICE_ROLE_KEY=
WA_BACKEND_URL=
WEBHOOK_SECRET=
```

## Arquivos

| Arquivo | Commitar? |
|---|---|
| `.env.example` | ✅ (sem valores reais) — template em `specs_default/env/env.example` |
| `.env.local` | ❌ gitignore |
| `.env.production` | ❌ — usar painel do host |

## Validação no boot (recomendado)

```ts
// src/lib/env/server.ts
import { z } from "zod";

const serverEnv = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // ...
});

export const env = serverEnv.parse(process.env);
```

Falha rápido em dev se variável crítica ausente.

## LLM: antes de usar variável

1. É secret? → server-only
2. Precisa no browser? → só se não for secret
3. Documentar em `.env.example` com comentário **por quê**

## Anti-patterns

| ❌ | ✅ |
|---|---|
| `process.env.SECRET` em component `"use client"` | Passar dado já processado do server |
| Logar `.env` no CI | Secrets no vault do host |
| Commit acidental | pre-commit hook bloqueia `.env` |

Ver também: `env/env.example`
