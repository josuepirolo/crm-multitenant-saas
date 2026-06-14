# Checklist e2e §5.4 — claim `authz` cross-service (ADR-007)

Roda **depois** de habilitar o Custom Access Token Hook no Supabase. Prova a ponta
a ponta: login real → claim `authz` no JWT → enforcement no backend WA.

Fonte: `backend_zapi/frontend/authz-architecture-and-crm-handoff.md` §5.4.
Hook validado em modo síntese (read-only) na aplicação da migration; este checklist
fecha a validação com **tokens reais**.

---

## 0. Pré-requisitos

- [ ] Hook habilitado: Supabase Dashboard → **Authentication → Hooks → Custom Access Token**
      → `public.custom_access_token_hook`. (É o go-live do claim.)
- [ ] `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `WA_BACKEND_URL` (o script lê de lá).
- [ ] **Usuários de teste por papel** (owner/admin/manager/sales/support) com senha
      conhecida, no MESMO workspace — e esse workspace com um `wa_tenant` vinculado e
      pelo menos 1 instância (para os testes do backend WA).
      > A base de produção hoje só tem membros `owner`. Crie os demais pela **tela de
      > convite do app** (provisão correta), não por SQL cru.

### Preflight (read-only) — quem existe e onde testar
```sql
-- papéis ativos por workspace + se o workspace tem instância WhatsApp vinculada
select w.name as workspace, wm.role, pr.email,
       exists(select 1 from workspace_integrations wi
              where wi.workspace_id = w.id and wi.wa_tenant_id is not null) as tem_wa
from workspace_members wm
join workspaces w  on w.id = wm.workspace_id
join profiles  pr on pr.id = wm.user_id
where wm.deleted_at is null
order by w.name, wm.role;

-- tenant_id + instance_id para usar nos testes do backend WA (de um workspace com tem_wa = true)
select wi.workspace_id, wi.wa_tenant_id
from workspace_integrations wi
where wi.wa_tenant_id is not null;
```

---

## 1. Confirmar que o hook está ativo (claim presente)

Rode o script com qualquer usuário de teste. Se o claim vier `null`, o hook **não**
está habilitado (volte ao passo 0).

```bash
# com senha (Turnstile bloqueia password-grant fora do app — prefira --admin)
node scripts/authz-e2e.mjs <email> <senha>

# sem captcha (service_role + generate_link → verify)
node scripts/authz-e2e.mjs --admin <email>
```
- [ ] Imprime `claim authz: { "v": 1, "superadmin": ..., "workspaces": { ... } }`.

---

## 2. Claim correto por papel (CRM-side)

Rode um por papel. O script valida `v=1` e as `perms integration.whatsapp.*`
esperadas (sem efeito colateral — só decodifica o token).

```bash
node scripts/authz-e2e.mjs --admin owner@ex.com   owner
node scripts/authz-e2e.mjs --admin admin@ex.com   admin
node scripts/authz-e2e.mjs --admin manager@ex.com manager
node scripts/authz-e2e.mjs --admin sales@ex.com   sales
node scripts/authz-e2e.mjs --admin support@ex.com support
```

Ou com senha (só funciona se o projeto não exigir captcha no password-grant):

```bash
node scripts/authz-e2e.mjs owner@ex.com   'senha' owner
node scripts/authz-e2e.mjs admin@ex.com   'senha' admin
node scripts/authz-e2e.mjs manager@ex.com 'senha' manager
node scripts/authz-e2e.mjs sales@ex.com   'senha' sales
node scripts/authz-e2e.mjs support@ex.com 'senha' support
```

Esperado (script imprime `✅ OK` em cada um):

| Papel | connection:view | instance:manage | account:edit |
|---|:---:|:---:|:---:|
| owner / admin | ✓ | ✓ | ✓ |
| manager | ✓ | — | — |
| sales / support | — | — | — |

- [ ] owner/admin → 3 perms · [ ] manager → só `connection:view` · [ ] sales/support → `[]`

---

## 3. Enforcement no backend WA

### 3a. Leitura (gate `connection:view`) — seguro, sem efeito colateral
Passe o `tenantId` (do preflight) como 4º argumento; o script faz `GET .../instances`
e confere o status.

```bash
node scripts/authz-e2e.mjs admin@ex.com 'senha' admin   <TENANT_ID>   # espera 200
node scripts/authz-e2e.mjs sales@ex.com 'senha' sales   <TENANT_ID>   # espera 403
```
- [ ] owner/admin/manager → **200** · [ ] sales/support → **403**

### 3b. Escrita (gate `instance:manage`) — testar pelo papel PROIBIDO (sem efeito)
Um papel sem `instance:manage` é rejeitado **antes** de qualquer ação → 403 sem
efeito colateral. (Não rode restart/disconnect como owner/admin no e2e, pois
**reinicia/desconecta de verdade** — só faça em instância descartável.)

```bash
# token de um manager/sales e um instance_id real:
TOKEN=  # obtenha via login (não comite); ex.: use o fluxo do script
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$WA_BACKEND_URL/management/instances/<INSTANCE_ID>/restart"
```
- [ ] manager/sales/support → **403** (rejeitado pelo gate, instância intacta)
- [ ] (opcional, instância descartável) admin/owner → 200

### 3c. Binding recurso→workspace (anti-vazamento §6)
Use um usuário de um workspace **A** e um `tenantId` de um workspace **B**.
```bash
node scripts/authz-e2e.mjs owner_A@ex.com 'senha' owner <TENANT_ID_DO_WORKSPACE_B>
```
- [ ] Mesmo sendo owner em A, a leitura do tenant de B retorna **403/404** (binding).

> Nota: o CRM (BFF) já bloqueia isso antes (anti-IDOR, `tenant∈workspace`); este
> teste valida a 2ª barreira, no próprio backend WA.

---

## 4. Superadmin (gate global)

```bash
node scripts/authz-e2e.mjs superadmin@ex.com 'senha'
```
- [ ] claim traz `"superadmin": true`.
- [ ] (opcional) `POST /admin/tenants` com esse token → **200** (cria tenant — só em
      ambiente de teste; tem efeito colateral).

---

## 5. Critério de pronto

- [ ] Passos 1–4 verdes.
- [ ] Nenhum token impresso/commitado (o script nunca imprime o access token).
- [ ] Só então liberar **WA Fase 1 (passo 4)** — o backend WA passa a depender do claim
      (mantendo o fallback do gate local enquanto houver tokens antigos → sem downtime).

## Rollback / desligar

- Desabilitar o hook em Auth → Hooks reverte a emissão do claim imediatamente (próximos
  tokens saem sem `authz`); o WA cai no gate local (Fase 0). A migration `20260613190000`
  é aditiva — para reverter o schema, remover as 3 permissões `integration.whatsapp.*`,
  seus `workspace_role_permissions` e `DROP FUNCTION public.custom_access_token_hook`
  (via migration versionada, nunca SQL ad-hoc).
