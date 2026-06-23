# Logging, erros e auditoria

## Erros ao client

```ts
// ❌ expõe internals
return { error: error.message, stack: error.stack };

// ✅ genérico + log servidor
console.error("[actionName]", { code: err.code, userId: user.id });
return { error: "Operação não concluída. Tente novamente." };
```

## O que logar no servidor

| ✅ | ❌ |
|---|---|
| action name, user id, workspace id | passwords, tokens, service_role |
| error code Supabase/HTTP | payload completo com PII |
| correlation id | cartão, documento |

## Regra de ouro (debug produção)

Erros mascarados na UI **devem** ter `console.error` no servidor com contexto — senão outages viram "algo deu errado" sem RCA.

## Audit log (recomendado multi-tenant)

Registrar mutações sensíveis:

- quem (`user_id`)
- o quê (`action` enum)
- tenant (`workspace_id`)
- metadata mínima (ids, não PII)

## Webhooks

- Logar receipt + signature valid (boolean)
- Não logar body completo se contém PII

## Monitoramento

- Alertas em spike de 401/403/429
- Falhas de auth hook / JWT validation
