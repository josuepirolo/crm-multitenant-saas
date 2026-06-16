# Recado ao time do backend WA — Bug em `get_my_tenant_id()` + RLS bloqueado

**De:** CRM Vendas WhatsApp (frontend/BFF)  
**Data:** 2026-06-15  
**Prioridade:** Alta — bloqueia leitura de `wa_conversations` e `wa_messages` via Supabase direto

---

## Contexto

Seguindo a recomendação do backend de usar **Supabase direto** para leitura de conversas
(ao invés do BFF `GET /api/tenants/.../conversations` que retorna 403), investigamos o RLS
das tabelas `wa_conversations` e `wa_messages`. Encontramos dois bugs.

---

## Bug 1 — `get_my_tenant_id()` referencia tabela inexistente

A função que protege o RLS de `wa_conversations` e `wa_messages`:

```sql
-- Definição atual (QUEBRADA):
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT current_tenant_id
  FROM tenant_users          -- ← tabela NÃO EXISTE no banco
  WHERE id = auth.uid()
$$;
```

**A tabela `tenant_users` não existe.** A tabela real é `wa_tenant_users`.

**Efeito:** `get_my_tenant_id()` sempre retorna `NULL` para todos os usuários.
A policy `tenant_id = get_my_tenant_id()` nunca casa nenhuma linha →
qualquer `SELECT` em `wa_conversations` ou `wa_messages` retorna 0 linhas
silenciosamente, sem erro.

---

## Bug 2 — `wa_tenant_users` está vazia

Mesmo corrigindo o nome da tabela, `wa_tenant_users` está sem nenhuma linha:

```sql
SELECT COUNT(*) FROM wa_tenant_users;
-- → 0
```

Usuários do CRM (autenticados via Supabase Auth) não estão em `wa_tenant_users`,
então a função continuaria retornando `NULL` mesmo com o nome corrigido.

---

## Fix recomendado

Em vez de manter `wa_tenant_users` em sync com os usuários CRM (trabalho manual,
risco de drift), sugerimos atualizar `get_my_tenant_id()` para derivar o
`tenant_id` das tabelas CRM que já existem e estão sempre atualizadas:

```sql
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT wi.wa_tenant_id
  FROM workspace_members wm
  JOIN workspace_integrations wi
    ON wi.workspace_id = wm.workspace_id
   AND wi.integration_type = 'whatsapp'
   AND wi.wa_tenant_id IS NOT NULL
   AND wi.deleted_at IS NULL
  WHERE wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  LIMIT 1
$$;
```

**Por que esse JOIN funciona:**

- `workspace_members.user_id = auth.uid()` → identifica o usuário CRM autenticado
- `workspace_integrations.wa_tenant_id` → já tem o `tenant_id` WA vinculado ao workspace
- Não requer nenhuma tabela nova nem sync manual
- Consistente com o modelo que o CRM já usa para autorização no BFF

**Impacto nas policies existentes:** zero — as policies continuam exatamente iguais,
só a função que resolve o `tenant_id` muda.

---

## Impacto atual (ambos os caminhos bloqueados)

| Caminho | Situação |
|---------|----------|
| BFF `GET /api/tenants/.../conversations?is_group=true` | 403 — usuário não está em `wa_tenant_members` |
| Supabase direto `SELECT * FROM wa_conversations` | 0 linhas — `get_my_tenant_id()` retorna NULL |

O fix acima desbloqueia o caminho Supabase direto (recomendado pelo backend),
que é a abordagem que queremos usar para leitura + Realtime.

---

## O que precisamos

Aplicar a migration com o `CREATE OR REPLACE FUNCTION` acima em produção.
Quando estiver feito, podemos validar com:

```sql
-- Testando como jdredes (owner do workspace Lekazis):
SELECT get_my_tenant_id();
-- Deve retornar: 14ee144b-050e-4003-94e7-fd1edf3bbd1e
```

Qualquer dúvida, estamos à disposição.
