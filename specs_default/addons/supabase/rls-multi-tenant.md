# Supabase — RLS e multi-tenant

## Regra

**Toda tabela com dados de usuário/tenant tem RLS ON.**

## Padrão workspace_id

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select ON items FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY items_insert ON items FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));
```

## App layer

```ts
// workspace_id SEMPRE do contexto autenticado — nunca do client
const workspaceId = await getWorkspaceId(user.id);
await repo.create({ ...data, workspace_id: workspaceId });
```

## service_role

- Bypass RLS — usar só server-side documentado
- Nunca expor ao browser
- Audit log em operações admin

## Armadilhas

| Bug | Mitigação |
|---|---|
| `LIMIT 1` sem ORDER BY em resolver tenant | Parametrizar workspace ativo da sessão |
| Subquery cruzada policies | Funções `SECURITY DEFINER` (padrão contato_access) |
| Tabela esquecida sem RLS | Checklist + advisors Supabase |
| Impersonation + RLS | Client scoped (admin) durante impersonation validada |

## Testes

`src/tests/security/tenant-isolation.test.ts` — obrigatório multi-tenant.
