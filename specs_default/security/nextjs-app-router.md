# Segurança — Next.js App Router

## Princípios

1. **Tudo no servidor é endpoint público** — Server Actions e Route Handlers podem ser invocados diretamente.
2. **Autentique dentro** de cada mutation/query sensível — não só no layout/middleware.
3. **RLS é a última linha** — app layer + RLS (defesa em profundidade).
4. **Client é hostil** — nunca confie em props, hidden fields ou headers do client para autorização.

## Server Components (RSC)

| ✅ | ❌ |
|---|---|
| Fetch de dados públicos ou já autorizados no server | Passar 50 campos se UI usa 3 |
| Compor árvore paralela (evitar waterfall) | `service_role` em RSC sem guard |
| Suspense boundaries estratégicos | Estado global mutável no módulo server |

## Server Actions

```ts
"use server";

export async function updateItem(data: unknown) {
  const user = await requireUser();           // 1. auth
  const workspaceId = await getWorkspaceId(); // 2. tenant
  await requirePermission("items", "edit");   // 3. RBAC
  const parsed = schema.parse(data);          // 4. zod
  await updateItemUseCase.execute({ ...parsed, workspaceId, userId: user.id });
  revalidatePath("/items");
}
```

## Route Handlers (`app/api/**`)

- Webhooks: validar **HMAC** ou assinatura antes de processar
- CORS explícito — não `*` com credentials
- Rate limit por IP + idempotency quando aplicável

## Middleware

- Refresh de sessão Supabase
- Redirect rotas auth vs dashboard
- **Não substitui** auth em Server Actions

## O que não serializar na borda RSC → Client

- Objetos completos do banco quando UI precisa de 2 campos
- Tokens, secrets, PII desnecessária
- Arrays `.map().filter()` duplicados — transformar no client se barato

## Referências

- `server-actions-and-api-routes.md`
- `cookies-middleware.md`
- `headers-csp.md`
