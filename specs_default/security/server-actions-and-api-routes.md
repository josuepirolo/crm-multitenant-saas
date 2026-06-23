# Server Actions e API Routes

## Server Actions = API pública

Next.js expõe Server Actions como endpoints HTTP. Trate **igual** Route Handler:

1. Autenticar
2. Autorizar (tenant + RBAC)
3. Validar input (Zod)
4. Executar UseCase
5. Retornar erro genérico ao client

## Template mínimo

```ts
"use server";

import { requireUser, getWorkspaceId } from "@/lib/guards";
import { actionSchema } from "@/lib/validations/feature";
import { createFeatureUseCase } from "@/usecases/CreateFeatureUseCase";

export async function createFeatureAction(raw: unknown) {
  try {
    const user = await requireUser();
    const workspaceId = await getWorkspaceId();
    const data = actionSchema.parse(raw);
    await createFeatureUseCase.execute({ ...data, workspaceId, userId: user.id });
    return { ok: true as const };
  } catch (e) {
    console.error("[createFeatureAction]", e); // servidor — sem secrets
    return { ok: false as const, error: "Não foi possível concluir a operação." };
  }
}
```

## Route Handlers

| Tipo | Auth |
|---|---|
| Webhook externo | HMAC / signature + timestamp |
| Cron interno | Bearer secret header (server-only env) |
| API para mobile | JWT validate + rate limit |
| Download público | Token assinado de curta duração |

## IDOR

Antes de read/update/delete:

```ts
const row = await repo.findById(id);
if (!row || row.workspace_id !== workspaceId) {
  throw new ForbiddenError();
}
```

Nunca confiar em `workspace_id` vindo do client.

## service_role

Só quando:

- Operação documentada cross-tenant (admin)
- Impersonation validada com audit log
- Migration/script server — nunca user flow comum

## Rate limiting

Aplicar em: login, register, reset password, convites, envio em massa, webhooks.

Ver `rate-limiting-validation.md`
