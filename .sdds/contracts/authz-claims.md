# Contrato do claim `authz` (cross-service) — CONGELADO v1

Status: **CONGELADO (v1)** em 2026-06-13 (acordo CRM ↔ backend WA).
Fonte: `backend_zapi/frontend/authz-architecture-and-crm-handoff.md` §3.
Decisão: [[ADR-007-autorizacao-cross-service-claims-jwt]].

> Interface compartilhada entre o CRM (dono da autorização) e os backends
> integradores (WhatsApp hoje; Instagram/outros amanhã). Qualquer mudança de
> **formato** exige **bump de `v`** e acordo coordenado documentado aqui.

## Onde
Claim adicionado ao **access token** pelo Custom Access Token Hook do Supabase
(`public.custom_access_token_hook`, migration `20260613190000`). Namespace:
`https://lekazis.app/authz`.

## Formato (v1)

```jsonc
{
  // ...claims padrão do Supabase (sub, email, role, exp, ...)
  "https://lekazis.app/authz": {
    "v": 1,                          // versão do contrato; bump = breaking
    "superadmin": false,             // profiles.is_superadmin (gate global)
    "workspaces": {
      "<workspace_id>": {
        "role": "admin",             // workspace_members.role (ou role custom)
        "perms": [                   // permissões EFETIVAS de integração resolvidas
          "integration.whatsapp.connection:view",
          "integration.whatsapp.account:edit",
          "integration.whatsapp.instance:manage"
        ]
      }
    }
  }
}
```

## Regras

- `perms` é a **lista efetiva já resolvida** (granular via `workspace_role_permissions`
  quando `workspace_members.workspace_role_id` definido; senão a system role homônima,
  que espelha a matriz hardcoded de `src/lib/permissions.ts`). O integrador faz só
  `perms.includes("integration.whatsapp.instance:manage")` — não re-resolve nada.
- **Implementação CRM (v1):** `perms` carrega **somente chaves `integration.*`**.
  Os integradores só consomem essas; mantém o token compacto (endereça a preocupação
  de tamanho do §3 sem precisar do plano B). O formato do claim é idêntico ao §3 —
  só o conteúdo de `perms` é filtrado ao namespace de integração.
- `superadmin` global, resolvido uma vez (substitui leitura direta de
  `profiles.is_superadmin` pelos integradores).
- **Default-deny:** ausência do claim, `v` desconhecido ou workspace ausente → nega.

## Catálogo de permissões de integração (semeado, migration `20260613190000`)

| Chave | Operação WA |
|---|---|
| `integration.whatsapp.connection:view` | GET status/qrcode/list, GET profile/privacy |
| `integration.whatsapp.instance:manage` | POST create/restart/disconnect |
| `integration.whatsapp.account:edit` | PUT profile/*, privacy/* |

Concessão às system roles: owner/admin → as 3; manager → só `connection:view`;
sales/support → nenhuma.

## Plano B (token grande) — exige bump de `v` coordenado

Se `perms` resolvido inchar o JWT além do limite prático (usuário com muitos
workspaces): enviar só `role` por workspace + mapa `role→perms` versionado embutido
nos integradores. Troca coordenada CRM ↔ WA, documentada aqui, com `v: 2`.

## Invariantes anti-vazamento (todo consumidor)

1. Default-deny (claim/versão/workspace ausente → nega).
2. **Binding recurso→workspace**: o integrador cruza o `workspace_id` do claim com a
   posse real do recurso (no WA: `wa_tenant_id → workspace_id` via `workspace_integrations`,
   `UNIQUE(wa_tenant_id)`, [[ADR-005-admin-wa-tenant-mapping]]). Não basta "é membro do
   wa_tenant" — tem de ser **o workspace dono daquele wa_tenant**.
3. Superadmin = um claim global, nunca re-derivado por serviço.
4. Staleness controlada: revogação vale no próximo refresh do token.
