# Recado ao time do backend WA — contratos operacionais (grupos, mensagens, campanhas)

**De:** CRM Vendas WhatsApp (frontend/BFF)  
**Para:** time `api-zapi-multitenant`  
**Data:** 2026-06-15  
**Contexto:** v2.3 de Integrações (conexão, QR, perfil/privacidade/foto) **implementada e validada**
no CRM. Próxima expansão = console operacional de WhatsApp no sidebar (grupos, envio avulso,
campanhas). Bloqueada até recebermos os contratos no mesmo formato de `management-instances` /
`account-settings`.

---

## O que já funciona (não precisa reexplicar)

| Módulo | Bundle atual | Status CRM |
|--------|--------------|------------|
| `management-instances` | `frontend_v3/wa-backend-integration-contracts.md` §1 | ✅ Live — status, QR, restart, disconnect |
| `account-settings` | idem §2 | ✅ Live — perfil, privacidade, foto via `media/uploads` |
| Authz claim `authz` v1 | `frontend_v3/authz-architecture-and-crm-handoff.md` | ✅ Hook habilitado; Fase 1 validada |

**Validação manual 2026-06-15 (usuário):** fluxo de **conexão e reconexão via QR** (desconectar →
gerar QR → escanear → conectar) funcionou ponta a ponta. O CRM lê o campo real `value` (URL de
pareamento) e renderiza o QR localmente — ver discovery
`.sdds/discoveries/2026-06-15-qrcode-contract-mismatch.md`.

---

## Pendência ainda aberta no bundle `frontend_v3`

O contrato §1.4 de `/qrcode` **continua documentando o shape errado**:

```json
{ "instance_id": "uuid", "qrcode": "data:image/png;base64,..." }
```

O backend **real** devolve:

```json
{ "instance_id": "uuid", "value": "https://wa.me/settings/linked_devices#..." }
```

Pedimos atualizar `wa-backend-integration-contracts.md` (e o contrato-fonte
`.sdds/contracts/management-instances.md` no repo WA) para refletir `value` como campo canônico.
Opcional: documentar se `qrcode` (data-URI) será suportado no futuro ou se `value` é o único
formato definitivo.

---

## O que precisamos agora (bloqueante para codar)

Exportar para `backend_zapi/frontend_v3/` (ou novo `frontend_v4/`) os contratos
**request/response + erros** dos módulos operacionais abaixo, no **mesmo formato** de
`wa-backend-integration-contracts.md` (tabelas de campos, exemplos JSON, códigos HTTP, invariantes).

### 1. `group-management` (prioridade alta)

O catálogo em `frontend-whatsapp-integration.md` §2.3 / §4 já lista gates:

| Operação | Roles hoje (`tenant_auth.py`) |
|----------|-------------------------------|
| Leitura (metadata, fila) | `GROUP_READ_ROLES` — owner, admin, manager, sales, support, member |
| Escrita (criar/editar grupo, participantes, admins) | `GROUP_WRITE_ROLES` — owner, admin, manager |

**Precisamos do contrato completo**, incluindo no mínimo:

- Base path do router (ex.: `/tenants/{tenant_id}/groups` ou equivalente)
- `GET` listar grupos (paginação, filtros, campos retornados)
- `POST` criar grupo (nome, descrição, participantes iniciais?)
- `GET` detalhe de um grupo
- `PUT/PATCH` editar metadados do grupo
- `POST/DELETE` adicionar/remover participante
- `POST/DELETE` promover/rebaixar admin do grupo
- Envelope de erro padrão (`404`, `403`, `409`, `502` Z-API)
- Campos sensíveis que **nunca** vão ao frontend
- Relação com `instance_id` (grupo é por tenant ou por instância?)

### 2. Envio de mensagem avulso (prioridade alta)

Hoje o doc diz: qualquer `wa_tenant_members` ativo pode enviar. Precisamos:

- Endpoint(s) de envio unitário (texto, mídia, template?)
- Request: destino (`phone`? `chat_id`? `group_id`?), corpo, anexos, `instance_id`?
- Response: `message_id`, status de entrega inicial, erros
- Rate limits ou quotas documentados
- Diferença entre envio para contato vs grupo (rotas distintas?)

### 3. Campanhas / envio em massa (prioridade média — pode ser fase 2)

Se o módulo já existe no backend:

- CRUD de campanha (criar, listar, pausar, cancelar)
- Upload/seleção de destinatários (CSV? lista de phones? segmento?)
- Status de processamento (fila, progresso, falhas por destinatário)
- Relação com `group-management` e contatos WA

Se campanhas ainda não têm API estável, indicar explicitamente no recado de resposta.

### 4. Contatos WA (prioridade baixa — só se envio depender)

Se envio/campanhas referenciam contatos do domínio WA (não CRM `contacts`):

- Contrato mínimo de listagem/sincronização de contatos WA, ou
- Declaração de que o CRM deve usar apenas `phone` E.164 sem catálogo WA

---

## Permissões authz — alinhamento coordenado (ADR-007)

Hoje o claim `authz` v1 semeia só:

- `integration.whatsapp.connection:view`
- `integration.whatsapp.instance:manage`
- `integration.whatsapp.account:edit`

Para o console operacional no sidebar, o CRM propõe **novas chaves** (ver
`.sdds/decisions/ADR-008-whatsapp-console-sidebar.md`):

| Chave proposta | Operações WA esperadas |
|----------------|------------------------|
| `integration.whatsapp.groups:view` | GET grupos, metadata, fila de leitura |
| `integration.whatsapp.groups:manage` | POST/PUT grupos, participantes, admins |
| `integration.whatsapp.messages:send` | Envio avulso (texto/mídia) |
| `integration.whatsapp.campaigns:view` | Listar campanhas, status |
| `integration.whatsapp.campaigns:manage` | Criar/editar/pausar campanhas |

**Pedido ao backend:**

1. Confirmar ou ajustar a gramática das chaves acima.
2. Indicar qual função `tenant_auth` / router passará a ler `authz.perms` (Fase 2 do gate),
   espelhando o que já foi feito para conexão/identidade.
3. Informar matriz role → permissão desejada (para o CRM semear `permissions` + hook).

Enquanto o gate por claim não estiver no backend, o CRM aplicará RBAC local + repasse JWT;
o backend continua com `_assert_tenant_member` / `GROUP_*_ROLES` como hoje.

---

## Formato de entrega esperado

Igual ao handoff que funcionou para v2.1:

```
backend_zapi/frontend_v4/   (ou atualizar frontend_v3/)
├── README.md
├── wa-backend-integration-contracts.md   ← acrescentar §3 group-management, §4 messages, §5 campaigns
└── frontend-whatsapp-integration.md        ← atualizar catálogo §2 com paths reais
```

Cada seção deve ter: método, path, path params, request body, response 2xx, tabela de erros,
notas de idempotência, e exemplos copy-paste.

---

## Referências no CRM

- ADR BFF: `.sdds/decisions/ADR-006-bff-wa-backend-management.md`
- ADR authz: `.sdds/decisions/ADR-007-autorizacao-cross-service-claims-jwt.md`
- ADR sidebar (proposta CRM): `.sdds/decisions/ADR-008-whatsapp-console-sidebar.md`
- Spec console: `.sdds/specs/whatsapp-console.spec.md`
- Discovery QR: `.sdds/discoveries/2026-06-15-qrcode-contract-mismatch.md`
