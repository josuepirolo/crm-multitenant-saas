# Backend WA — contratos de integração para o frontend

> Documento de **handoff** para o time de frontend/CRM. Contratos request/response dos
> módulos de integração WhatsApp consumidos via BFF (`WA_BACKEND_URL`).
>
> Fonte: `.sdds/contracts/` (repo do backend WA). Atualizado em **2026-06-15**
> (§1–§2 v2.3 Integrações; §3–§8 console operacional).

## 0. Conexão e autenticação

| Item | Valor |
|------|-------|
| **WA_BACKEND_URL** | `https://messageapi.py.tec.br` |
| Auth | `Authorization: Bearer <JWT Supabase>` em **todas** as rotas abaixo |
| Validação | JWKS Supabase (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`) — mesmo token do CRM |
| Content-Type | `application/json` (exceto upload — `multipart/form-data`) |

### 0.1 Famílias de path (importante para o BFF)

| Família | Prefixo | Módulos |
|---------|---------|---------|
| Admin conexão | `/management` | instâncias, status, QR, restart, disconnect |
| Por instância | `/tenants/{tenant_id}/instances/{instance_id}` | account-settings, groups, contacts, media/uploads |
| API tenant | `/api/tenants/{tenant_id}/...` | conversations, messages (manual), campaigns |
| API recurso | `/api/conversations/{conversation_id}/...` | mensagens do chat, status da conversa |

`tenant_id` = `wa_tenants.id` (via `workspace_integrations.wa_tenant_id`).
`instance_id` = `wa_instances.id` (UUID do banco, não ID Z-API).

### 0.2 Autorização (authz)

| Módulo | Gate hoje | Futuro (claim `authz` v2) |
|--------|-----------|---------------------------|
| §1 management, §2 account-settings | `authz.require_permission` + fallback role | `connection:view`, `instance:manage`, `account:edit` |
| §4 groups | `GROUP_READ_ROLES` / `GROUP_WRITE_ROLES` | `groups:view`, `groups:manage` (proposto CRM) |
| §3 contacts, §5 messages, §6 chat, §7 campaigns | membro ativo do tenant | `messages:send`, `campaigns:view/manage` (proposto) |

Shapes dos endpoints **não mudam** com authz Fase 2 — só mais `403` para papéis sem permissão.
Detalhe: `docs/frontend/authz-architecture-and-crm-handoff.md`.

### 0.3 Erros padrão

| Código | Quando |
|--------|--------|
| `401` | JWT ausente/inválido/expirado |
| `403` | Não-membro do tenant / sem permissão / binding workspace (authz) |
| `404` | Recurso ou instância não encontrada |
| `409` | Conflito de estado (já conectado, campanha já disparada, grupo não apto) |
| `422` | Payload inválido |
| `502` | Z-API falhou — `{ "error": "zapi_error", "detail": "..." }` ou string |

**Nunca** retornados: `credentials` Z-API, `raw_payload` de webhooks.

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
  { "instance_id": "uuid", "value": "https://wa.me/settings/linked_devices#..." }
  ```
  > `value` é o código/URL de pareamento devolvido cru pela Z-API — **não** é um
  > data URI de imagem. Renderize o QR a partir dessa string no client.
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
  Campos nunca configurados retornam `null` — no CRM use **"Não definido"**
  (não assumir `ALL`). Significa: painel nunca aplicou; estado real no celular
  é desconhecido (Z-API sem read).

  Quando a instância está **connected**, o backend reconcilia automaticamente com
  Z-API `GET /device` e persiste diffs em `wa_instances.profile`. Campos opcionais
  extras quando disponíveis: `phone`, `business` (contas Business).

- **`GET .../profile` → 200 (exemplo pós-sync Lekazis):**
  ```json
  {
    "instance_id": "uuid-do-banco",
    "name": "Lekazis",
    "picture_url": "https://pps.whatsapp.net/...",
    "description": null,
    "synced_at": "2026-06-14T23:55:00Z",
    "phone": "554497000434",
    "business": { "email": "contato@lekazis.com.br", "websites": ["https://lekazis.com.br"] }
  }
  ```

### 2.2 Privacidade

> **Modelo de dados:** valores aplicados via PUT ficam em `wa_instances.privacy`
> (jsonb). `GET /privacy` lê **só esse cache** — a Z-API não expõe leitura dos
> settings atuais (probe `405` em `last-seen`, `photo`, etc.). Exceção:
> `GET .../disallowed-contacts` faz proxy ao vivo e **não** cacheia.
>
> **Perfil** (`§2.1`) é diferente: `GET /profile` reconcilia online via
> `GET /device` e persiste diffs em `wa_instances.profile` + `phone`.

#### Catálogo dos 8 controles

| Setting (PUT) | Campo GET `/privacy` | Body PUT | Valores |
|---------------|----------------------|----------|---------|
| `.../privacy/last-seen` | `last_seen` | `{ visualizationType, contactsBlacklist? }` | `ALL` \| `NONE` \| `CONTACT_BLACKLIST` |
| `.../privacy/photo` | `photo` | idem | quem vê sua foto |
| `.../privacy/description` | `description` | idem | quem vê seu recado |
| `.../privacy/online` | `online` | idem | quem vê status online |
| `.../privacy/group-add` | `group_add` | `{ type, contactsBlacklist? }` | **`type`** (não `visualizationType`) |
| `.../privacy/read-receipts` | `read_receipts` | `{ value }` | `"enable"` \| `"disable"` |
| `.../privacy/messages-duration` | `messages_duration` | `{ value }` | `"days90"` \| `"days7"` \| `"hours24"` \| `"disable"` |
| *(lista bloqueados)* | — | — | `GET .../disallowed-contacts?type=...` |

`contactsBlacklist` no PUT: `[{ "action": "add"|"remove", "phone": "5511..." }]`.
No GET cache: array de strings (telefones adicionados).

`messages-duration` afeta apenas **novas** conversas 1:1; não retroage.

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

## 3. contact-management — sincronizar e consultar contatos WhatsApp

Base: `/tenants/{tenant_id}/instances/{instance_id}/contacts`. (**Implementado**.)

> **Domínio separado do CRM:** `wa_contacts` (backend WA) ≠ `contacts` (CRM).
> Campanhas usam IDs de `wa_contacts`. Para sincronizar contatos do CRM com WhatsApp:
> 1) `exists-batch` com os telefones → 2) `add-contacts` na agenda do aparelho →
> 3) webhooks/`contact_processor` populam `wa_contacts` ao longo do uso.

Telefone: E.164 **sem** `+` — regex `^\d{10,15}$`. Batch máx **50** números/chamada.

### 3.1 Verificar se números têm WhatsApp (sync passo 1)

`POST .../contacts/exists-batch`

```json
{ "phones": ["5544999999999", "5544888888888"] }
```

**Response 200:**
```json
{
  "results": [
    { "phone": "5544999999999", "exists": true },
    { "phone": "5544888888888", "exists": false }
  ]
}
```

### 3.2 Adicionar contatos à agenda do aparelho (sync passo 2)

`POST .../contacts/add-contacts`

```json
{
  "contacts": [
    { "first_name": "João", "phone": "5544999999999", "last_name": "Silva" }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "errors": [],
  "contacts": ["5544999999999"]
}
```

`DELETE .../contacts/remove-contacts` — body `{ "phones": ["5544..."] }` — remove da agenda.

### 3.3 Consultas (tempo real Z-API, sem cache local)

| Método | Path | Response resumida |
|--------|------|-------------------|
| `GET` | `.../contacts?page=1&page_size=20` | `{ contacts: [{phone,name,photo_url}], page, page_size, total }` |
| `GET` | `.../contacts/{phone}` | `{ phone, name, short_name, photo_url }` |
| `GET` | `.../contacts/{phone}/exists` | `{ phone, exists: true }` |
| `GET` | `.../contacts/{phone}/profile-picture` | `{ phone, photo_url }` — `null` se privacidade |

### 3.4 Bloquear / denunciar

`POST .../contacts/block` — `{ "phone": "5544...", "action": "block" | "unblock" }`
`POST .../contacts/{phone}/report` — sem body

### Erros
`400` phone inválido · `403` não-membro · `404` instância · `502` Z-API

---

## 4. group-management — criar e administrar grupos

Base: `/tenants/{tenant_id}/instances/{instance_id}/groups`. (**Implementado**.)

**`{group_id}`** na URL = ID Z-API (`120363356737170752-group`), **não** UUID de `wa_conversations`.

**Listar grupos:** não há `GET .../groups`. Use §6.1 com `is_group=true` ou crie e guarde o `group_id` retornado.

### Gates de role

| Operação | Roles permitidos |
|----------|------------------|
| Leitura (metadata, readiness, convites) | owner, admin, manager, sales, support, member |
| Escrita (criar, editar, participantes, admins) | owner, admin, manager |

Instância deve estar **connected** (409 se desconectada).

### 4.1 Criar grupo

`POST .../groups`

```json
{
  "groupName": "Grupo Vendas",
  "phones": ["5544999999999"],
  "autoInvite": true
}
```

**Response 200:**
```json
{
  "created": true,
  "group_id": "120363356737170752-group",
  "group_name": "Grupo Vendas",
  "conversation_id": "uuid-wa_conversations-ou-null",
  "result": { }
}
```

Participantes precisam ser identificáveis (`process_contact`); senão `400` com `failed_phones`.

### 4.2 Metadata e prontidão

`GET .../groups/{group_id}` — metadata ao vivo Z-API:
```json
{ "group_id": "120363...-group", "result": { }, "synced_at": "ISO-8601" }
```

`GET .../groups/{group_id}/readiness` — checagens antes de enviar mensagem:
```json
{
  "group_id": "120363...-group",
  "ready": true,
  "checks": [{ "name": "...", "passed": true, "detail": "...", "required": true }],
  "synced_at": "ISO-8601"
}
```

Envio em grupo (§5) exige `ready=true`; senão `409` `grupo_nao_apto`.

### 4.3 Editar metadados

Todas exigem `{ "value": "..." }` no body (foto aceita URL ou path `MEDIA_ROOT`):

| Método | Path | Ação Z-API |
|--------|------|------------|
| `PUT` | `.../groups/{group_id}/name` | renomear |
| `PUT` | `.../groups/{group_id}/photo` | foto do grupo |
| `PUT` | `.../groups/{group_id}/description` | descrição |

**Response 200 (padrão mutação):**
```json
{
  "applied": true,
  "group_id": "120363...-group",
  "action": "update_name",
  "value": "Novo nome",
  "applied_at": "ISO-8601"
}
```

`PUT .../groups/{group_id}/settings` — body parcial:
```json
{
  "adminOnlyMessage": true,
  "adminOnlySettings": false,
  "requireAdminApproval": true,
  "adminOnlyAddMember": false
}
```
Pelo menos um campo obrigatório.

### 4.4 Participantes e admins

Body comum: `{ "phones": ["5544999999999"] }`

| Método | Path | `action` na resposta |
|--------|------|----------------------|
| `POST` | `.../participants` | `add_participants` |
| `DELETE` | `.../participants` | `remove_participants` |
| `POST` | `.../participants/approve` | `approve_participants` |
| `POST` | `.../participants/reject` | `reject_participants` |
| `POST` | `.../admins` | `add_admins` |
| `DELETE` | `.../admins` | `remove_admins` |
| `POST` | `.../leave` | `leave_group` (sem body) |

### 4.5 Convites e fila de entrada

| Método | Path | Notas |
|--------|------|-------|
| `GET` | `.../groups/invitation-metadata?url=<chat.whatsapp.com/...>` | preview de link |
| `GET` | `.../groups/accept-invite?url=<link>` | entrar no grupo |
| `POST` | `.../groups/{group_id}/invite-link/reset` | invalida link anterior |
| `GET` | `.../groups/membership-requests` | fila de pedidos de entrada |
| `POST` | `.../groups/membership-requests/{request_id}/approve` | |
| `POST` | `.../groups/membership-requests/{request_id}/reject` | |

### Erros
`403` sem permissão · `404` instância/grupo · `422` payload · `502` Z-API

---

## 5. send-messages — envio avulso e no chat

Base: `/api`. (**Implementado**.)

Mesmo contrato de body para **contato 1:1 e grupo** — campo `to` / telefone da conversa aceita
`5511999999999` ou `120363356737170752-group`.

### 5.1 Body comum

```json
{
  "type": "text",
  "text": "Olá!"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `type` | `text` \| `image` \| `audio` \| `video` \| `document` | ✅ |
| `text` | string | ✅ se `type=text` |
| `media_url` | string (URL ou path `MEDIA_ROOT`) | ✅ se mídia |
| `caption` | string | ❌ (image/video/document) |
| `filename` | string | ❌ (document — extrai extensão) |
| `to` | string | ✅ só no endpoint por instância (§5.3) |

`media_url` local → backend gera link público temporário via `media-public-links` automaticamente.

### 5.2 Enviar no chat (conversa existente)

`POST /api/conversations/{conversation_id}/messages`

- Destino resolvido pela conversa (`wa_contacts.phone` ou `group_provider_id`).
- `origin_type=chat` internamente.
- Grupos: valida `readiness` antes do envio.

**Response 201:**
```json
{
  "message_id": "uuid",
  "conversation_id": "uuid",
  "provider_message_id": "3EB0...",
  "status": "sent"
}
```

### 5.3 Enviar avulso (nova conversa ou grupo direto)

`POST /api/tenants/{tenant_id}/instances/{instance_id}/messages`

```json
{
  "to": "120363356737170752-group",
  "type": "text",
  "text": "Mensagem no grupo"
}
```

- Cria/atualiza `wa_contacts` + `wa_conversations` se necessário.
- `origin_type=manual`.
- `to` = telefone E.164 ou `group_id` Z-API.

**Response 201:**
```json
{
  "message_id": "uuid",
  "conversation_id": "uuid",
  "contact_id": "uuid",
  "provider_message_id": "3EB0...",
  "status": "sent"
}
```

### Erros
`409` instância desconectada / grupo não apto · `502` Z-API · demais §0.3

**Rate limits:** não há quota documentada para envio avulso (diferente de campanhas §7).

---

## 6. conversations — listar chats e histórico

Base: `/api`. (**Implementado**.)

Alimentado por webhooks Z-API → `wa_conversations` + `wa_messages`. Leitura só do banco.

### 6.1 Listar conversas (inbox)

`GET /api/tenants/{tenant_id}/conversations`

| Query | Tipo | Descrição |
|-------|------|-----------|
| `status` | `open` \| `closed` \| `archived` | filtro opcional |
| `is_group` | boolean | `true` = só grupos · `false` = só 1:1 |
| `limit` | int | default 20, máx 100 |
| `offset` | int | paginação |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid-conversa",
      "instance_id": "uuid-instancia",
      "is_group": true,
      "group_name": "Grupo Vendas",
      "group_provider_id": "120363356737170752-group",
      "status": "open",
      "assigned_to": null,
      "last_message_at": "2026-06-15T12:00:00Z",
      "last_message_preview": "Última mensagem...",
      "unread_count": 2,
      "contact": {
        "id": "uuid-contato",
        "display_name": "Grupo Vendas",
        "phone": "120363356737170752-group",
        "profile_photo_url": null
      }
    }
  ],
  "limit": 20,
  "offset": 0
}
```

Ordenação: `last_message_at DESC`. Use `group_provider_id` para chamadas §4.

### 6.2 Histórico de mensagens

`GET /api/conversations/{conversation_id}/messages?limit=50&before=<ISO-8601>`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "direction": "inbound",
      "from_me": false,
      "sent_by": null,
      "message_type": "text",
      "text_body": "Olá",
      "caption": null,
      "status": "read",
      "sent_at": "2026-06-15T12:00:00Z",
      "created_at": "2026-06-15T12:00:01Z",
      "is_deleted": false,
      "is_edited": false,
      "edited_at": null,
      "reply_to_provider_id": null,
      "forwarded": false,
      "fail_reason": null,
      "fail_code": null
    }
  ],
  "limit": 50,
  "before": null
}
```

Ordenação: `sent_at DESC` — **inverta no UI** para exibir cronológico.
Mensagens `is_deleted=true` não aparecem. `raw_payload` nunca é exposto.

### 6.3 Alterar status da conversa

`PATCH /api/conversations/{conversation_id}/status`

```json
{ "status": "closed" }
```

Valores: `open` | `closed` | `archived`.

**Response 200:** `{ "ok": true, "conversation_id": "uuid", "status": "closed" }`

### Fluxo chat completo (UI)

1. `GET .../conversations` → lista inbox
2. Usuário abre thread → `GET .../messages`
3. Enviar → `POST .../conversations/{id}/messages` (§5.2)
4. Polling/websocket futuro: re-fetch `messages` com `before` para paginar

---

## 7. campaigns — envio em massa

Base: `/api/tenants/{tenant_id}/campaigns`. (**Implementado**.)

Tabelas: `wa_campaigns`, `wa_campaign_recipients`, `wa_contacts`, `wa_send_origins`.
Requer `plans.has_campaigns=true` no tenant (senão `403`).

Status: `draft` → `scheduled` → `sending` ⇄ `paused` → `completed` | `cancelled` | `failed`

### 7.1 Criar campanha (rascunho)

`POST /api/tenants/{tenant_id}/campaigns`

```json
{
  "name": "Promoção Junho",
  "type": "text",
  "instance_id": "uuid-instancia",
  "text": "Olá! Confira nossa promoção.",
  "scheduled_at": null
}
```

| Campo | Obrigatório |
|-------|-------------|
| `name`, `type`, `instance_id` | ✅ |
| `text` | ✅ se `type=text` |
| `media_url` | ✅ se mídia |
| `caption`, `filename`, `scheduled_at` | ❌ |

**Response 201:**
```json
{
  "campaign_id": "uuid",
  "name": "Promoção Junho",
  "status": "draft",
  "type": "text",
  "instance_id": "uuid",
  "recipient_count": 0,
  "scheduled_at": null,
  "created_at": "ISO-8601"
}
```

### 7.2 Definir audiência

`PUT /api/tenants/{tenant_id}/campaigns/{campaign_id}/audience`

Só em `draft` ou `scheduled`.

**Por contatos WA (`wa_contacts.id`):**
```json
{ "audience_type": "contacts", "contact_ids": ["uuid-1", "uuid-2"] }
```

**Por labels WhatsApp:**
```json
{ "audience_type": "labels", "label_ids": ["uuid-label"] }
```

**Por filtro (útil para phones vindos do CRM):**
```json
{
  "audience_type": "filter",
  "filter": {
    "phones": ["5544999999999"],
    "phone_prefix": "5544",
    "display_name_contains": "João",
    "instance_id": "uuid-instancia-opcional"
  }
}
```

Exclui automaticamente `opt_out=true` e `has_whatsapp=false`.

**Response 200:**
```json
{
  "campaign_id": "uuid",
  "audience_type": "filter",
  "recipient_count": 150,
  "excluded_opt_out": 3,
  "excluded_no_whatsapp": 1
}
```

> Não há endpoint de listagem de destinatários — use contadores no `GET` detalhe (§7.3).

### 7.3 Listar e detalhar

`GET /api/tenants/{tenant_id}/campaigns?status=sending&limit=20&offset=0`

**Response 200:**
```json
{
  "items": [
    {
      "campaign_id": "uuid",
      "name": "Promoção Junho",
      "status": "sending",
      "type": "text",
      "instance_id": "uuid",
      "recipient_count": 150,
      "sent_count": 45,
      "failed_count": 2,
      "pending_count": 103,
      "scheduled_at": null,
      "started_at": "ISO-8601"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

`GET /api/tenants/{tenant_id}/campaigns/{campaign_id}` — detalhe com
`delivered_count`, `read_count`, `skipped_count`, `pending_count`, `finished_at`, etc.

### 7.4 Ciclo de vida

| Método | Path | Efeito | Response |
|--------|------|--------|----------|
| `POST` | `.../launch` | inicia/ agenda disparo | `{ campaign_id, status: "sending", send_origin_id, started_at }` |
| `POST` | `.../pause` | pausa fila | `{ campaign_id, status: "paused" }` |
| `POST` | `.../resume` | retoma | `{ campaign_id, status: "sending" }` |
| `POST` | `.../cancel` | cancela pendentes | `{ campaign_id, status: "cancelled", skipped_count }` |

**Pré-condições `launch`:** `recipient_count > 0`, conteúdo completo, instância connected,
cota mensal do plano não excedida (`409` se violar).

Mídia local: gera link público de campanha (sem TTL fixo) em `wa_media_public_links`.

### Erros campanha
`403` feature desabilitada · `409` estado inválido / sem destinatários / cota · `502` mídia

---

## 8. media-uploads — upload para mensagens e campanhas

`POST /tenants/{tenant_id}/media/uploads` — `multipart/form-data`

| Campo | Valor |
|-------|-------|
| `file` | binário |
| `media_type` | `image` \| `audio` \| `video` \| `document` |

**Response 201:**
```json
{
  "file_path": "{tenant_id}/uploads/2026-06/abc.jpg",
  "media_url": "{tenant_id}/uploads/2026-06/abc.jpg",
  "preview_url": "https://messageapi.py.tec.br/media/public/<token>",
  "preview_expires_at": "ISO-8601",
  "media_type": "image",
  "mime_type": "image/jpeg",
  "size_bytes": 245678,
  "original_filename": "foto.jpg"
}
```

Use `media_url` / `file_path` como `media_url` em §5 ou §7, ou `value` em foto de grupo/perfil.

Limites: image 5MB, audio/video 16MB, document 100MB (configurável por env).

---

## 9. Fluxos UI sugeridos

### 9.1 Integrações v2.3 (conexão + perfil) — já live

1. `GET /management/tenants/{tenant_id}/instances`
2. `GET /management/instances/{instance_id}/status` (polling; `connected` canônico)
3. QR: `GET .../qrcode` → renderizar `value` (não base64)
4. Perfil/privacidade: §2

### 9.2 Sincronizar contatos CRM → WhatsApp

1. Extrair phones E.164 do CRM
2. `POST .../contacts/exists-batch` → marcar quem tem WA
3. `POST .../contacts/add-contacts` → agenda do aparelho (opcional)
4. Para campanha: `audience_type=filter` com `phones[]` ou mapear para `wa_contacts.id`

### 9.3 Console de grupos

1. Listar: `GET .../conversations?is_group=true`
2. Detalhe: `GET .../groups/{group_provider_id}`
3. Criar: `POST .../groups`
4. Editar: PUT name/photo/description/settings
5. Participantes/admins: POST/DELETE participants/admins
6. Enviar: §5.2 ou §5.3 com `to=group_provider_id`

### 9.4 Chat operacional

1. Inbox: §6.1
2. Thread: §6.2 + §5.2
3. Arquivar: §6.3

### 9.5 Campanhas

1. Upload mídia (se aplicável): §8
2. Criar rascunho: §7.1
3. Audiência: §7.2
4. Launch → monitorar contadores: §7.3
5. Pause/resume/cancel: §7.4

---

## 10. Referência rápida (módulos anteriores)

| Módulo | Base | Seção |
|--------|------|-------|
| Provisioning (superadmin) | `/admin/tenants` | `.sdds/contracts/tenant-provisioning.md` |
| Hierarquia/permissões | — | `frontend-whatsapp-integration.md` |

Resposta ao recado CRM (`REQUEST-operational-contracts-groups-messages-campaigns.md`):
handoff §3–§8 cobre grupos, mensagens, campanhas, contatos e chat. QR `value` já em §1.4.
Authz Fase 2 (chaves `groups:*`, `messages:send`, `campaigns:*`) — gramática aprovada;
backend ainda usa gates locais §0.2.
