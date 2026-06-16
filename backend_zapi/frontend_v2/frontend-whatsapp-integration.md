# Integração WhatsApp — endpoints, modelo de dados e permissões

> Guia de referência para o frontend: como o modelo de dados liga
> `workspace` (CRM) ↔ `wa_tenant` (backend WA) ↔ `wa_instances` (Z-API),
> quais endpoints existem para **administrar** essa integração, e quem pode
> fazer o quê.
>
> Para o contrato completo (request/response, erros) de cada endpoint, ver
> `.sdds/contracts/` no repositório do backend
> (`management-instances.md`, `account-settings.md`,
> `tenant-provisioning.md`, `media-uploads.md`). O catálogo completo de
> endpoints **operacionais** (mensagens, grupos, campanhas, contatos, mídia)
> está fora do escopo deste documento — ver `.sdds/contracts/` para cada
> módulo.

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
         status, credentials (Z-API token), profile, privacy (jsonb)
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

### 2.2 Perfil/privacidade da conta conectada — `app/routers/account_settings.py`

Editam o WhatsApp já conectado em uma instância (`wa_instances.profile` /
`wa_instances.privacy`, cache local — Z-API não expõe leitura própria).

| Método | Path | Função |
|--------|------|--------|
| `GET` | `/tenants/{tenant_id}/instances/{instance_id}/profile` | Lê nome/foto/descrição (cache) |
| `PUT` | `/tenants/{tenant_id}/instances/{instance_id}/profile/{field}` | Atualiza `name`\|`description`\|`picture` |
| `GET` | `/tenants/{tenant_id}/instances/{instance_id}/privacy` | Lê os 8 controles de privacidade (cache) |
| `PUT` | `/tenants/{tenant_id}/instances/{instance_id}/privacy/{setting}` | Atualiza um controle genérico |
| `PUT` | `/.../privacy/group-add` \| `/read-receipts` \| `/messages-duration` | Controles com payload específico |
| `GET` | `/.../privacy/disallowed-contacts` | Lista contatos bloqueados para visualização |

Checagem hoje: mesmo padrão — membro ativo do tenant, qualquer role
(`_assert_tenant_member` próprio do router, duplicado de
`management_instances.py`).

Foto de perfil pode usar o upload novo
(`POST /tenants/{tenant_id}/media/uploads`, `media_type=image`) → usar o
`media_url`/`file_path` retornado como `value` em
`PUT .../profile/picture` (ver `.sdds/specs/media-uploads.md`).

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
| Criar/listar/operar instâncias WhatsApp de um tenant | Qualquer `wa_tenant_members` ativo (qualquer role) | `management_instances.py::_assert_tenant_member` |
| Editar perfil/privacidade da conta WhatsApp | idem | `account_settings.py::_assert_tenant_member` |
| Criar/editar grupos, gerenciar participantes/admins | `owner`, `admin`, `manager` | `tenant_auth.assert_group_write_access` |
| Ver grupos (metadata, fila) | `owner`, `admin`, `manager`, `sales`, `support`, `member` | `tenant_auth.assert_group_read_access` |
| Enviar mensagens, criar campanhas, links públicos de mídia, uploads | Qualquer `wa_tenant_members` ativo | `_assert_tenant_member` (cada router) ou `tenant_auth.assert_tenant_member` |
| Vincular `workspace_id` ↔ `wa_tenant_id` (`workspace_integrations`) | Quem tiver `profiles.is_superadmin=true` | CRM — `requireSuperAdmin()` em `integrations-actions.ts` |
| Criar `wa_tenant` novo / 1º membro `owner` | Quem tiver `profiles.is_superadmin=true` | `POST /admin/tenants` / `POST /admin/tenants/{tenant_id}/members` (ADR-007) |
| Qualquer operação **deste backend** gated por `is_superadmin` | Os 2 endpoints de `tenant-provisioning` (acima) | `app/services/admin_auth.py::assert_superadmin` |
