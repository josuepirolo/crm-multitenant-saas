# Recado ao time do backend WA — createGroup timeout

**De:** CRM Vendas WhatsApp (frontend/BFF)  
**Data:** 2026-06-16  
**Contexto:** commit 659f749 resolveu o 403 em conversations/campaigns (obrigado!). 
Listagem de grupos e campanhas funcionando. Criação de grupo ainda falha.

---

## O que está acontecendo

`POST /tenants/{tenant_id}/instances/{instance_id}/groups` não está respondendo.
A requisição atinge o backend (conexão aceita), mas não há resposta dentro de 30s.

Logs do CRM:

```
[wa-bff] Backend WA inacessível.
ƒ createWaGroup("14ee144b-...", "cd5301d1-...", "Vip Lekazis #02", ["5544998094320"]) in 16616ms
```

O `WaBackendUnreachableError` é lançado quando o `fetch` estoura o timeout — não é 
falha de rede (nesse caso daria erro imediato). O servidor recebeu mas não respondeu.

---

## O que o CRM está enviando

```
POST https://messageapi.py.tec.br/tenants/14ee144b-050e-4003-94e7-fd1edf3bbd1e/instances/cd5301d1-1b65-45b5-983d-1e04ad0ff729/groups
Authorization: Bearer <JWT válido — mesmo token que funciona em management e conversations>
Content-Type: application/json

{
  "groupName": "Vip Lekazis #02",
  "phones": ["5544998094320"],
  "autoInvite": true
}
```

Path conforme contrato §4: `/tenants/{tenant_id}/instances/{instance_id}/groups`.

---

## O que pedimos

1. Verificar se o router `group_management` está recebendo e processando o `POST /groups`
   (logs FastAPI, traceback Python, etc.)
2. Confirmar se o path está correto ou se mudou (ex.: `/api/tenants/...` como conversations)
3. Se for bug de processamento interno, compartilhar o erro para avaliarmos se é no payload

---

## Obs: a listagem de grupos funciona

`GET /api/tenants/{tenant_id}/conversations?is_group=true` → 200 ✅  
(path diferente — usa família `/api/tenants/`, não `/tenants/`)

A criação vai para `/tenants/{tid}/instances/{iid}/groups` (família `/tenants/`) — 
confirmar se essa família está acessível no ambiente de produção.
