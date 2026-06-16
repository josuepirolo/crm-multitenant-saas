# Integração WhatsApp — endpoints, modelo de dados e permissões

> Guia de referência para o frontend: como o modelo de dados liga
> `workspace` (CRM) ↔ `wa_tenant` (backend WA) ↔ `wa_instances` (Z-API),
> quais endpoints existem para **administrar** essa integração, e quem pode
> fazer o quê.
>
> Para o contrato completo (request/response, erros) de cada endpoint, ver
> **`wa-backend-integration-contracts.md`** (handoff §1–§8). Fonte interna:
> `.sdds/contracts/` no repositório do backend.

## 1. Modelo de dados e relacionamentos

```
auth.users (Supabase Auth)
   │
   ├── profiles (CRM/frontend)
   │     id, current_workspace_id → workspaces.id
   │     is_superadmin, is_owner          ← flags do lado CRM
   │
   └── wa_tenant_users (backend WA — tabela própria, NÃO é profiles!)
         id, current_tenant_id → wa_tenants.id
         is_superadmin                    ← flag do lado WA backend

workspaces (CRM)
   │
   └── workspace_integrations
         workspace_id  → workspaces.id
         integration_type (ex: "whatsapp")
         provider_id   → wa_providers.id  (ex: "zapi")
         wa_tenant_id  → wa_tenants.id    ← ponte workspace ↔ wa_tenant
         status (pending|active|...)

wa_tenants (backend WA — "organização" no domínio WhatsApp)
   │
   ├── wa_tenant_members
   │     tenant_id → wa_tenants.id
   │     user_id   → wa_tenant_users.id
   │     role      ('owner'|'admin'|'manager'|'sales'|'support'|'member')
   │     is_active
   │
   └── wa_instances  (1 ou N por tenant — múltiplos números WhatsApp)
         tenant_id → wa_tenants.id
         provider_id → wa_providers.id
         status, credentials (Z-API token), phone,
         profile (jsonb), privacy (jsonb)
```

**Pontos-chave:**

- `id` de `wa_tenant_users` é o mesmo UUID do usuário Supabase Auth
  (`auth.uid()` / `profiles.id`) por convenção — não há FK formal para
  `auth.users`, mas é a mesma identidade. Ou seja, o `sub` do JWT validado
  por `require_auth` (`app/core/auth.py`) é o `id` usado em
  `wa_tenant_members.user_id` e `wa_tenant_users.id`.
- **Um `workspace` (CRM) pode ter várias `workspace_integrations`** (uma
  por `integration_type`/provider), e cada uma aponta para **um
  `wa_tenant`**. Um `wa_tenant`, por sua vez, pode ter **N `wa_instances`**
  (múltiplos números WhatsApp sob a mesma organização).
- Existem **duas flags `is_superadmin` distintas**, em tabelas diferentes:
  - `profiles.is_superadmin` / `profiles.is_owner` — escopo CRM/workspace
    (fora deste repositório). **É essa flag que governa o "dono do SaaS"**:
    é ela que o CRM checa (`requireSuperAdmin()`) antes de vincular/
    desvincular `workspace_integrations`, e é ela que gateia
    `POST /admin/tenants*` neste backend (ADR-007).
  - `wa_tenant_users.is_superadmin` — escopo backend WA. **Não utilizado**
    em nenhum dos dois sistemas (campo presente no schema, sem propósito
    definido hoje).

## 2. Endpoints de administração da integração

Todos exigem `Authorization: Bearer <JWT Supabase>` (`require_auth`).

### 2.1 Gerenciamento de instâncias — `app/routers/management_instances.py`

| Método | Path | Função | Checagem hoje |
|--------|------|--------|---------------|
| `POST` | `/management/tenants/{tenant_id}/instances` | Cria instância (provisiona na Z-API via `ZAPI_PARTNER_TOKEN`, salva em `wa_instances`) | tenant existe + usuário é membro ativo (`wa_tenant_members.is_active=true`), **qualquer role** |
| `GET` | `/management/tenants/{tenant_id}/instances` | Lista instâncias do tenant | idem |
| `GET` | `/management/instances/{instance_id}/status` | Status de conexão na Z-API | idem (via `wa_instances.tenant_id`) |
| `GET` | `/management/instances/{instance_id}/qrcode` | QR code para pareamento (409 se já conectado) | idem |
| `POST` | `/management/instances/{instance_id}/restart` | Reinicia a instância na Z-API | idem |
| `POST` | `/management/instances/{instance_id}/disconnect` | Desconecta + marca `disconnected` em `wa_instances` | idem |

Contrato completo (schemas de request/response, erros):
`.sdds/contracts/management-instances.md`.

### 2.2 Perfil e privacidade da conta conectada — `app/routers/account_settings.py`

Gerencia o WhatsApp **já pareado** em uma instância (`wa_instances`). Dados
persistidos **por instância** (1 número = 1 conjunto de configurações).

Contrato request/response detalhado:
`docs/frontend/wa-backend-integration-contracts.md` §2.

#### Por que armazenamos em `wa_instances` (profile / privacy)?

O painel precisa mostrar configurações **sem depender só da memória da sessão**
e **sem chamar a Z-API a cada pixel da UI**. Por isso o backend mantém cache
em colunas jsonb da própria instância:

| Coluna | Conteúdo | Atualizado quando |
|--------|----------|-------------------|
| `wa_instances.profile` | `name`, `picture_url`, `description`, `business?`, `synced_at` | PUT perfil (sucesso Z-API) **ou** GET perfil (reconciliação online) |
| `wa_instances.privacy` | 8 controles + `synced_at` | **Somente** após PUT privacidade com sucesso na Z-API |
| `wa_instances.phone` | número E.164 conectado | Sync do GET perfil (`GET /device` na Z-API) |

**Princípio:** ao **consultar**, o backend tenta refletir a realidade online;
ao **alterar**, aplica na Z-API primeiro e só então grava no banco (nunca
“configuração fantasma”).

```
┌─────────────┐     GET /profile      ┌──────────────┐     GET /device      ┌───────┐
│   Frontend  │ ───────────────────► │  Backend WA  │ ───────────────────► │ Z-API │
│   (CRM)     │ ◄─────────────────── │ wa_instances │ ◄─────────────────── │       │
└─────────────┘   JSON consolidado   └──────────────┘   name, imgUrl, about └───────┘
                                           │
                                           │ compara cache ↔ online
                                           │ se divergir → UPDATE profile + phone
```

**Privacidade é diferente:** a Z-API **não expõe leitura** dos valores atuais
(`GET /privacy/last-seen` etc. → `405`). Por isso `GET /privacy` retorna
**somente o cache** — o que foi aplicado pelo painel (ou vazio/`null` se nunca
configurou). Não há como “bater online e atualizar” privacidade hoje; ver
DISC-003 (`.sdds/discoveries/DISC-003-zapi-device-profile-read.md`).

#### GET `/profile` — leitura com reconciliação online

Quando `wa_instances.status == "connected"`:

1. Backend chama Z-API `GET /device` (validado: probe 200, DISC-003).
2. Mapeia: `name` ← `name`, `picture_url` ← `imgUrl`, `description` ← `about`.
3. Se conta Business: opcionalmente `GET /business/profile` → campo `business`.
4. Compara com `wa_instances.profile`; se diferente ou cache vazio → **persiste**.
5. Retorna JSON consolidado (mesmo shape de antes + campos opcionais).

**Resposta 200** (campos core — front **não precisa mudar** para funcionar):

```json
{
  "instance_id": "uuid-do-banco",
  "name": "Lekazis",
  "picture_url": "https://pps.whatsapp.net/...",
  "description": null,
  "synced_at": "2026-06-14T23:55:00Z"
}
```

Campos **opcionais** (podem ignorar ou tipar depois):

| Campo | Tipo | Origem |
|-------|------|--------|
| `phone` | string \| null | `GET /device.phone` |
| `business` | object \| null | `GET /business/profile` (contas Business) |

> **Front:** se o dialog já faz `GET .../profile` no load, nome/foto passam a
> aparecer automaticamente após deploy do backend — **sem alteração de rota
> nem de contrato core**.

#### PUT `/profile/{field}` — escrita (name | picture | description)

1. Valida authz (`integration.whatsapp.account:edit` — owner/admin).
2. Exige instância **connected** (409 se desconectada).
3. Aplica na Z-API (`PUT /profile-name`, `/profile-picture`, `/profile-description`).
4. Só após **200 da Z-API** → atualiza `wa_instances.profile` + `synced_at`.

Foto: `value` pode ser URL pública ou caminho em `MEDIA_ROOT` (resolve via
`media-public-links` antes de enviar à Z-API).

#### GET `/privacy` — leitura do cache local

Retorna o jsonb `wa_instances.privacy`. Campos **nunca setados pelo painel**
vêm `null` — **não significa** “Todos” no WhatsApp; significa **desconhecido**
(número configurado direto no app do celular). UX recomendada: placeholder
**"Não definido"** (já feito no CRM commit `99cfbc3`).

**Resposta 200:**

```json
{
  "instance_id": "uuid",
  "last_seen": null,
  "photo": null,
  "description": null,
  "online": null,
  "group_add": null,
  "read_receipts": null,
  "messages_duration": null,
  "synced_at": null
}
```

Após um PUT bem-sucedido, cada chave passa a ter valor + `synced_at` global.

#### Catálogo completo — 8 controles de privacidade

| # | Setting (rota PUT) | Chave no GET `/privacy` | Tipo de valor | Valores / enum |
|---|-------------------|-------------------------|---------------|----------------|
| 1 | `PUT .../privacy/last-seen` | `last_seen` | objeto | `visualizationType`: `ALL` \| `NONE` \| `CONTACT_BLACKLIST` + `contactsBlacklist[]` opcional |
| 2 | `PUT .../privacy/photo` | `photo` | objeto | idem — quem vê **sua foto de perfil** |
| 3 | `PUT .../privacy/description` | `description` | objeto | idem — quem vê **seu recado** |
| 4 | `PUT .../privacy/online` | `online` | objeto | idem — quem vê quando você está **online** |
| 5 | `PUT .../privacy/group-add` | `group_add` | objeto | **`type`** (não `visualizationType`): `ALL` \| `NONE` \| `CONTACT_BLACKLIST` + blacklist |
| 6 | `PUT .../privacy/read-receipts` | `read_receipts` | string | `"enable"` \| `"disable"` |
| 7 | `PUT .../privacy/messages-duration` | `messages_duration` | string | `"days90"` \| `"days7"` \| `"hours24"` \| `"disable"` |
| 8 | *(sem PUT dedicado)* | — | — | **Lista de bloqueados** por escopo → rota separada abaixo |

**Objeto de visualização** (last-seen, photo, description, online):

```json
{
  "visualizationType": "CONTACT_BLACKLIST",
  "contactsBlacklist": ["5511999990000", "5511988880000"]
}
```

No cache, `contactsBlacklist` é array de **strings** (telefones), simplificado
em relação ao PUT (que usa `{action, phone}`).

**group-add** (peculiaridade Z-API — chave `type` em vez de `visualizationType`):

```json
{ "type": "ALL" }
```
ou
```json
{
  "type": "CONTACT_BLACKLIST",
  "contactsBlacklist": ["5511999990000"]
}
```

**read-receipts** — confirmações de leitura (✓✓ azuis); não se aplica a grupos.

**messages-duration** — mensagens temporárias em **novas** conversas 1:1 apenas;
não retroage conversas existentes.

#### GET `/privacy/disallowed-contacts?type={scope}` — proxy ao vivo (sem cache)

Único GET de privacidade que bate **direto na Z-API** (não persiste em
`wa_instances.privacy`):

| Query `type` | Escopo |
|--------------|--------|
| `lastSeen` | Bloqueados para ver “visto por último” |
| `photo` | Bloqueados para ver foto |
| `description` | Bloqueados para ver recado |
| `groupAdd` | Bloqueados para adicionar em grupos |

Resposta: `{ "type": "photo", "contacts": ["5511..."] }` (shape passthrough Z-API).

#### Endpoints (resumo)

| Método | Path | Leitura online Z-API? | Persiste em `wa_instances`? |
|--------|------|-------------------------|----------------------------|
| `GET` | `.../profile` | ✅ `GET /device` (+ `/business/profile`) | ✅ reconcilia se diff |
| `PUT` | `.../profile/{field}` | ✅ escrita Z-API | ✅ após sucesso |
| `GET` | `.../privacy` | ❌ cache only | lê jsonb |
| `PUT` | `.../privacy/*` | ✅ escrita Z-API | ✅ após sucesso |
| `GET` | `.../privacy/disallowed-contacts` | ✅ proxy Z-API | ❌ não cacheia |

Checagem de auth: claim JWT Fase 1 (ADR-008) — leitura
`integration.whatsapp.connection:view` (owner/admin/manager); escrita
`integration.whatsapp.account:edit` (owner/admin).

Foto de perfil: upload via `POST /tenants/{tenant_id}/media/uploads`
(`media_type=image`) → usar `file_path`/`media_url` como `value` em
`PUT .../profile/picture` (ver `.sdds/specs/media-uploads.md`).

#### O que o frontend precisa fazer

| Ação | Obrigatório? |
|------|--------------|
| Continuar chamando `GET .../profile` e `GET .../privacy` no dialog | ✅ já existe |
| Tratar `null` em privacidade como **"Não definido"** | ✅ já corrigido no CRM |
| Ajustar copy do banner: perfil **agora sincroniza**; privacidade **não** | Recomendado (cosmético) |
| Tipar `phone?` e `business?` no GET profile | Opcional |
| Exibir horários/email Business | Opcional (`business` object) |

**Nenhuma mudança de rota, BFF ou contrato core é necessária** para o perfil
passar a mostrar nome/foto reais.

### 2.5 Console operacional — grupos, chat, campanhas, contatos

Contratos request/response: **`wa-backend-integration-contracts.md` §3–§8**.
Todos exigem JWT Supabase + `tenant_id` / `instance_id` conforme a família de path (§0.1).

| Caso de uso | Router | Paths principais |
|-------------|--------|------------------|
| Sincronizar contatos com WA | `contact_management.py` | `POST .../contacts/exists-batch`, `POST .../contacts/add-contacts` |
| Listar/consultar contatos WA | idem | `GET .../contacts`, `GET .../contacts/{phone}` |
| Listar grupos (inbox) | `conversations.py` | `GET /api/tenants/{tid}/conversations?is_group=true` |
| Criar/editar grupo | `group_management.py` | `POST/PUT .../groups/...` (por `instance_id`) |
| Metadata grupo ao vivo | idem | `GET .../groups/{group_provider_id}` |
| Chat — inbox e histórico | `conversations.py` | `GET .../conversations`, `GET .../conversations/{id}/messages` |
| Enviar no chat | `send_messages.py` | `POST /api/conversations/{id}/messages` |
| Enviar avulso (1:1 ou grupo) | idem | `POST /api/tenants/{tid}/instances/{iid}/messages` |
| Campanhas CRUD + disparo | `campaigns.py` | `POST/GET /api/tenants/{tid}/campaigns`, `.../audience`, `.../launch` |
| Upload mídia | `media_uploads.py` | `POST /tenants/{tid}/media/uploads` |

**Notas:**
- Grupo na URL = `group_provider_id` Z-API (`*-group`), não UUID de conversa.
- Campanhas usam `wa_contacts.id` ou filtro `phones[]` — domínio separado do CRM `contacts`.
- Envio em grupo valida `GET .../groups/{id}/readiness` internamente.
- Listagem de grupos **não** tem rota dedicada — use conversas com `is_group=true`.

### 2.3 Papéis hoje aplicados (`app/services/tenant_auth.py`)

`wa_tenant_members.role` só é **efetivamente verificado** em
`group-management` (criar/editar grupos, gerenciar participantes/admins):

| Constante | Roles | Usado por |
|-----------|-------|-----------|
| `GROUP_READ_ROLES` | owner, admin, manager, sales, support, member | leitura de grupos |
| `GROUP_WRITE_ROLES` | owner, admin, manager | administração de grupos |

Nos demais módulos (instâncias, perfil/privacidade, conversas, contatos,
envio, campanhas, media-public-links, media-uploads), a checagem é
**"é membro ativo do tenant"**, sem distinção de `role`.

### 2.4 Provisioning de tenants (dono do SaaS) — `app/routers/tenant_provisioning.py`

Restrito a `profiles.is_superadmin=true` (ADR-007).

| Método | Path | Função | Checagem |
|--------|------|--------|----------|
| `POST` | `/admin/tenants` | Cria `wa_tenants` novo (`slug`, `name`, `display_name?`) | `profiles.is_superadmin=true` |
| `POST` | `/admin/tenants/{tenant_id}/members` | Adiciona o 1º membro (`wa_tenant_members`, com upsert de `wa_tenant_users`) | `profiles.is_superadmin=true` |

Contrato completo (schemas de request/response, erros):
`.sdds/contracts/tenant-provisioning.md`.

## 3. Fluxo de onboarding — novo tenant no SaaS

Passo a passo completo para o "dono do SaaS" habilitar a integração
WhatsApp de um novo workspace:

| # | Operação | Onde | Gate |
|---|----------|------|------|
| 1 | Criar `wa_tenant` novo | `POST /admin/tenants` (backend WA) | `profiles.is_superadmin` |
| 2 | Adicionar 1º membro (`role='owner'`) | `POST /admin/tenants/{tenant_id}/members` (backend WA) | `profiles.is_superadmin` |
| 3 | Vincular `workspace_id` ↔ `wa_tenant_id` (`workspace_integrations`) | `linkWaTenantAdmin()` (CRM, `integrations-actions.ts`) | `requireSuperAdmin()` |
| 4 | Criar a 1ª instância Z-API do tenant | `POST /management/tenants/{tenant_id}/instances` (backend WA) | membro ativo do tenant |

Notas:

- Passos 1, 2 e 4 são deste backend; o passo 3 é feito no CRM — por design
  (ADR-001 do CRM), o CRM nunca escreve em tabelas `wa_*`, apenas em
  `workspace_integrations`.
- Um workspace pode ter **N** `workspace_integrations`, mas cada
  `wa_tenant_id` só pode estar vinculado a **1** workspace
  (`UNIQUE(wa_tenant_id)`).
- O passo 4 (provisionar a instância Z-API de fato) hoje continua
  parcialmente manual via `scripts/register_zapi_instance.py`, até a conta
  atingir **10 instâncias ativas** — requisito da Z-API para liberar o
  `ZAPI_PARTNER_TOKEN` (Partners API) e automatizar esse passo
  ponta a ponta.

Referências: `.sdds/specs/tenant-provisioning.md`,
`.sdds/contracts/tenant-provisioning.md`,
`.sdds/decisions/ADR-007-leitura-cross-domain-profiles-superadmin.md`.

## 4. Matriz de permissões (estado atual do código)

| Ação | Quem pode hoje | Onde é checado |
|------|----------------|----------------|
| Criar/listar/operar instâncias WhatsApp de um tenant | `owner`/`admin` escrevem; `manager` lê (authz Fase 1) | `management_instances.py` + `authz.require_permission` |
| Editar perfil/privacidade da conta WhatsApp | `owner`/`admin` | `account_settings.py` + authz |
| Criar/editar grupos, gerenciar participantes/admins | `owner`, `admin`, `manager` | `tenant_auth.assert_group_write_access` |
| Ver grupos (metadata, fila) | `owner`, `admin`, `manager`, `sales`, `support`, `member` | `tenant_auth.assert_group_read_access` |
| Enviar mensagens, criar campanhas, links públicos de mídia, uploads | Qualquer `wa_tenant_members` ativo | `_assert_tenant_member` (cada router) ou `tenant_auth.assert_tenant_member` |
| Vincular `workspace_id` ↔ `wa_tenant_id` (`workspace_integrations`) | Quem tiver `profiles.is_superadmin=true` | CRM — `requireSuperAdmin()` em `integrations-actions.ts` |
| Criar `wa_tenant` novo / 1º membro `owner` | Quem tiver `profiles.is_superadmin=true` | `POST /admin/tenants` / `POST /admin/tenants/{tenant_id}/members` (ADR-007) |
| Qualquer operação **deste backend** gated por `is_superadmin` | Os 2 endpoints de `tenant-provisioning` (acima) | `app/services/admin_auth.py::assert_superadmin` |
