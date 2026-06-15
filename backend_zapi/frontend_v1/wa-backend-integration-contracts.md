# Backend WA — contratos de integração para o frontend

> Documento de **handoff** para o time de frontend/CRM. Responde diretamente ao
> que faltava para a v2.1: a **URL do backend** e os **contratos de
> request/response** dos endpoints de `management-instances` e
> `account-settings` (incluindo `/status` e `/qrcode`).
>
> Fonte: `.sdds/contracts/management-instances.md` e
> `.sdds/contracts/account-settings.md` (repo do backend WA). Gerado em
> 2026-06-13.

## 0. Conexão e autenticação

| Item | Valor |
|------|-------|
| **WA_BACKEND_URL** | `https://messageapi.py.tec.br` |
| Auth | `Authorization: Bearer <JWT Supabase>` em **todas** as rotas abaixo |
| Validação | O backend valida a **assinatura** do JWT via JWKS do Supabase (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`). É o **mesmo** token de sessão do CRM — não há login separado. |
| Content-Type | `application/json` (exceto upload de mídia — `multipart/form-data`) |

> ⚠️ **Autorização hoje vs. amanhã:** atualmente o backend só checa "é membro
> ativo do `wa_tenant`" (qualquer papel). Está em curso o gate por papel
> (`owner`/`admin` para escrever conexão/identidade) — ver
> `docs/frontend/authz-architecture-and-crm-handoff.md`. O **shape dos endpoints abaixo
> não muda** com isso; só passa a poder retornar `403` para papéis sem
> permissão. Pode tipar contra os shapes abaixo sem medo de retrabalho.

---

## 1. management-instances

Base: `/management`. (Contrato v1.0.0, **implementado**.)

### 1.1 `POST /management/tenants/{tenant_id}/instances` — criar instância

- **Path:** `tenant_id` (UUID, `wa_tenants.id`)
- **Request:**
  ```json
  { "name": "Instância Vendas", "phone": "5511999999999" }
  ```
  | Campo | Tipo | Obrigatório |
  |-------|------|-------------|
  | `name` | string | ✅ |
  | `phone` | string | ❌ (preenchido após conexão) |
- **Response 201:**
  ```json
  {
    "instance_id": "uuid-do-banco",
    "name": "Instância Vendas",
    "status": "disconnected",
    "provider_id": "zapi"
  }
  ```
- **Erros:** `404` tenant inexistente · `502` Z-API falhou · `500` banco falhou após criar na Z-API

### 1.2 `GET /management/tenants/{tenant_id}/instances` — listar

- **Response 200** (array):
  ```json
  [
    {
      "instance_id": "uuid",
      "name": "Instância Vendas",
      "phone": "+5511999999999",
      "status": "connected",
      "provider_id": "zapi",
      "connected_at": "2026-05-20T09:00:00Z"
    }
  ]
  ```
- **Nunca** retorna `credentials`.

### 1.3 `GET /management/instances/{instance_id}/status` — status de conexão

- **Path:** `instance_id` (UUID, `wa_instances.id`)
- **Response 200** (passthrough da Z-API + `instance_id` injetado):
  ```json
  {
    "instance_id": "uuid",
    "status": "connected",
    "connected": true,
    "smartphoneConnected": true,
    "session": "CONNECTED"
  }
  ```
  > Para o badge "ao vivo": `connected` (boolean) é o sinal canônico;
  > `status` é o espelho persistido no banco; `session`/`smartphoneConnected`
  > vêm crus da Z-API.

### 1.4 `GET /management/instances/{instance_id}/qrcode` — QR de pareamento

- **Response 200:**
  ```json
  { "instance_id": "uuid", "qrcode": "data:image/png;base64,..." }
  ```
  > `qrcode` é um **data URI** pronto para `<img src=...>`.
- **Erros:** `404` instância não encontrada · `409` **já conectada** (sem QR — use isso para fechar o `QrCodeDialog` e mostrar "conectado")

### 1.5 `POST /management/instances/{instance_id}/restart`

- **Response 200:** `{ "ok": true, "instance_id": "uuid" }`

### 1.6 `POST /management/instances/{instance_id}/disconnect`

- **Response 200:** `{ "ok": true, "instance_id": "uuid" }`

### Invariantes (todos)
- `credentials` Z-API **nunca** vão ao frontend.
- `instance_id` na resposta é sempre o UUID do **banco** (não o ID Z-API).
- Erro Z-API → `502` com `{ "error": "zapi_error", "detail": "..." }`.

---

## 2. account-settings

Base: `/tenants/{tenant_id}/instances/{instance_id}`. (**Implementado** —
ignore o "proposta" no cabeçalho do contrato-fonte, está desatualizado.)

Todas as mutações respondem no **mesmo envelope**:
```json
{ "applied": true, "field": "<campo>", "value": <valor-aplicado>, "updated_at": "ISO-8601" }
```

### 2.1 Perfil

| Rota | Request | `field` na resposta |
|------|---------|---------------------|
| `PUT .../profile/name` | `{ "value": "Atendimento Lekazis" }` | `name` |
| `PUT .../profile/description` | `{ "value": "Atendimento 8h-18h" }` | `description` |
| `PUT .../profile/picture` | `{ "value": "<url pública OU caminho em MEDIA_ROOT>" }` | `picture` (response `value` = URL pública resolvida) |

`profile/picture` aceita URL externa **ou** caminho de mídia local
(`MEDIA_ROOT`), resolvido via `media-public-links` antes de ir à Z-API. Para
upload novo, use `POST /tenants/{tenant_id}/media/uploads` (multipart) e passe
o caminho retornado como `value`.

- **`GET .../profile` → 200:**
  ```json
  {
    "instance_id": "uuid-do-banco",
    "name": "Atendimento Lekazis",
    "picture_url": "https://wa.exemplo.com/m/<token>",
    "description": "Atendimento 8h-18h",
    "synced_at": "2026-06-08T12:00:00Z"
  }
  ```
  Campos nunca configurados retornam `null`.

### 2.2 Privacidade

`last-seen`, `photo`, `description`, `online` usam **`visualizationType`**:
```json
PUT .../privacy/last-seen
{ "visualizationType": "CONTACT_BLACKLIST",
  "contactsBlacklist": [ { "action": "add", "phone": "5511999990000" } ] }
```
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `visualizationType` | `ALL`\|`NONE`\|`CONTACT_BLACKLIST` | ✅ |
| `contactsBlacklist` | `[{action: add\|remove, phone}]` | ✅ se `CONTACT_BLACKLIST` (proibido p/ `ALL`/`NONE`) |

`group-add` é igual mas usa a chave **`type`** em vez de `visualizationType`
(peculiaridade da Z-API).

`read-receipts` → `{ "value": "enable" | "disable" }`
`messages-duration` → `{ "value": "days90" | "days7" | "hours24" | "disable" }`

- **`GET .../privacy` → 200** (cache consolidado):
  ```json
  {
    "instance_id": "uuid-do-banco",
    "last_seen": { "visualizationType": "ALL" },
    "photo": { "visualizationType": "CONTACT_BLACKLIST", "contactsBlacklist": ["5511999990000"] },
    "description": { "visualizationType": "ALL" },
    "online": { "visualizationType": "ALL" },
    "group_add": { "type": "CONTACT_BLACKLIST", "contactsBlacklist": ["5511999990000"] },
    "read_receipts": "enable",
    "messages_duration": "disable",
    "synced_at": "2026-06-08T12:00:00Z"
  }
  ```
- **`GET .../privacy/disallowed-contacts?type=lastSeen|photo|description|groupAdd` → 200:**
  ```json
  { "type": "photo", "contacts": ["5511999990000", "5511988880000"] }
  ```

### Erros (todos de account-settings)
| Código | Condição |
|--------|----------|
| `403` | não-membro do tenant / sem permissão (papel — ver nota §0) |
| `404` | `tenant_id`/`instance_id` não encontrado ou não pertence ao tenant |
| `422` | corpo inválido (campo ausente/fora do enum; `CONTACT_BLACKLIST` sem `contactsBlacklist`; phone inválido; arquivo inexistente em `MEDIA_ROOT`) |
| `502` | Z-API retornou erro ao aplicar |

---

## 3. Para tipar a aba "Integrações" (status ao vivo + QR)

Fluxo mínimo que o front consegue montar **hoje** com os contratos acima:

1. Listar instâncias do tenant → `GET /management/tenants/{tenant_id}/instances`.
2. Para cada uma, status ao vivo → `GET /management/instances/{instance_id}/status` (polling; `connected` é o sinal canônico).
3. Botão "Conectar"/"Parear" → `GET /management/instances/{instance_id}/qrcode`; renderizar `qrcode` (data URI) no `QrCodeDialog`; `409` = já conectado → fechar e atualizar status.
4. "Reiniciar"/"Desconectar" → `POST .../restart` | `.../disconnect`.
5. Aba "Perfil"/"Privacidade" → `GET/PUT` de account-settings (§2).

Gate de UI sugerido (consistente com o backend em andamento): mostrar ações de
**escrita** (criar/reiniciar/desconectar, editar perfil/privacidade) só para
`owner`/`admin`; leitura (status/QR/listar) para `owner`/`admin`/`manager`.
Detalhe e racional em `docs/frontend/authz-architecture-and-crm-handoff.md`.

---

## 4. Outros endpoints (referência rápida)

| Módulo | Endpoint | Doc-fonte |
|--------|----------|-----------|
| Provisioning (superadmin) | `POST /admin/tenants`, `POST /admin/tenants/{id}/members` | `.sdds/contracts/tenant-provisioning.md` |
| Upload de mídia | `POST /tenants/{tenant_id}/media/uploads` (multipart) | `.sdds/contracts/media-uploads.md` |
| Hierarquia/permissões | — | `docs/frontend/frontend-whatsapp-integration.md` |

Precisa do request/response completo desses também? Peça que eu exporto para
cá no mesmo formato.
