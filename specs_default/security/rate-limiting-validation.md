# Rate limiting e validação

## Validação

| Camada | Ferramenta | Propósito |
|---|---|---|
| Client | Zod + RHF | UX imediata |
| Server | Zod **obrigatório** | Segurança — client bypassável |

```ts
const schema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
});
```

## Rate limit — quando aplicar

| Endpoint | Limite sugerido |
|---|---|
| Login | 5–10 / 15min / IP+email |
| Register | 3 / hora / IP |
| Reset password | 3 / hora / email |
| Convites | 20 / hora / workspace |
| Bulk import | 5 / hora / workspace |
| Webhook | por provider doc |

## Implementação

- Store: Redis / Upstash / KV edge (preferível serverless)
- Chave: `ratelimit:{action}:{identifier}`
- Resposta: `429` + mensagem genérica

## Uploads

- Validar MIME (magic bytes, não só extension)
- Tamanho máximo
- Nome sanitizado — sem path traversal
- Storage privado + signed URL quando download

## Sanitização

- HTML user-generated: DOMPurify ou render plain text
- SQL: sempre parameterized (Supabase client OK)
- Logs: nunca senha/token
