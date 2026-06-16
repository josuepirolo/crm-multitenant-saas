# Console WhatsApp — sidebar + módulos operacionais — Spec

Módulo: whatsapp (console operacional)
Versão: 1.0
Data: 2026-06-15
Status: SPEC (design aprovado — implementação faseada, ver [[ADR-008]])

> **Pré-requisitos concluídos:** Integrações v2.3 em `/settings` (ADR-006), authz claim v1 (ADR-007),
> validação manual de conexão/reconexão QR (2026-06-15).

---

## 1. Objetivo

Oferecer ao usuário do workspace um **console operacional de WhatsApp** acessível pelo sidebar,
com subitens para conexão, grupos, envio de mensagem e (futuro) campanhas — sem duplicar a
arquitetura BFF já implementada para integrações.

---

## 2. Contexto e restrições herdadas

- **[[ADR-001]]** — WA API é fonte de verdade; CRM nunca escreve em `wa_*` nem lê credentials.
- **[[ADR-005]]** — vínculo `workspace_id ↔ wa_tenant_id` continua exclusivo do superadmin em `/admin`.
- **[[ADR-006]]** — todas as chamadas ao backend WA passam por Server Actions com JWT repassado;
  `instance_id` validado contra `workspace_integrations` (anti-IDOR).
- **[[ADR-007]]** — permissões `integration.whatsapp.*` no claim JWT; novas chaves para grupos/mensagens
  (ver §8).
- **[[ADR-008]]** — decisão de sidebar, rotas, faseamento e matriz de permissões.

---

## 3. IA do sidebar

### 3.1 Visibilidade

Mostrar seção **WhatsApp** no sidebar quando:

```ts
workspaceHasWhatsAppIntegration === true
// ≥1 row em workspace_integrations WHERE workspace_id = contexto AND integration_type = 'whatsapp'
```

Não exibir se zero vínculos (mesmo empty state orientando contato com suporte).

### 3.2 Estrutura (expansível)

```
WhatsApp                          [ícone MessageCircle]
├── Conexão          → /whatsapp/conexao
├── Grupos           → /whatsapp/grupos      (fase 2)
├── Enviar mensagem  → /whatsapp/enviar      (fase 3)
└── Campanhas        → /whatsapp/campanhas  (fase 4)
```

- Collapsed sidebar (desktop): ícone único → primeiro subitem ou popover (decidir na implementação fase 1).
- Mobile drawer: mesma hierarquia, indentação visual nos subitens.

### 3.3 Gate por subitem

| Subitem | Permissão CRM (gate Server Action) | Fallback sem claim |
|---------|-----------------------------------|-------------------|
| Conexão (leitura) | `settings:view` + `integration.whatsapp.connection:view` | settings:view |
| Conexão (mutação) | `settings:edit` + chaves instance/account | settings:edit |
| Grupos (leitura) | `integration.whatsapp.groups:view` | `settings:view` até migration |
| Grupos (escrita) | `integration.whatsapp.groups:manage` | `settings:edit` até migration |
| Enviar | `integration.whatsapp.messages:send` | membro com settings:view* |
| Campanhas | `campaigns:view` / `campaigns:manage` | idem |

\* Gate provisório até permissões semeadas — documentar em harness.

---

## 4. Escopo por fase

### Fase 1 — Shell + Conexão (sem bloqueio externo)

- Submenu WhatsApp no sidebar
- Rotas `src/app/(dashboard)/whatsapp/layout.tsx` + `conexao/page.tsx`
- Extrair componentes de `/settings` integrations para `src/components/whatsapp/connection/*`
- `/settings` aba Integrações: redirect ou link para `/whatsapp/conexao`
- Reuso de `integrations-actions.ts` (renomear/mover para `whatsapp/connection-actions.ts` quando conveniente — patch mínimo na fase 1: import dos mesmos actions)
- Harness: navegação sidebar, visibilidade com/sem integração, deep-link settings

### Fase 2 — Grupos (bloqueado: contrato backend)

- Listagem paginada de grupos do tenant
- Criar grupo (nome, descrição, participantes iniciais se API suportar)
- Detalhe: lista de participantes, promover/rebaixar admin, adicionar/remover
- Seletor de instância quando workspace tem N integrações
- Empty / error / skeleton
- Server Actions: `listWaGroups`, `createWaGroup`, `updateWaGroup`, `manageWaGroupMember`, …
- Repository: `WaGroupsRepository` tipado contra contrato exportado
- Auditoria: `WA_GROUP_CREATED`, `WA_GROUP_UPDATED`, `WA_GROUP_MEMBER_CHANGED`

### Fase 3 — Enviar mensagem (bloqueado: contrato backend)

- Formulário: instância, destino (phone E.164 ou grupo), texto, anexo opcional
- Preview de destino (validação Zod phone)
- Feedback de envio (sucesso / erro amigável)
- Sem armazenar histórico no CRM (WA é fonte de verdade — ADR-001)
- Auditoria: `WA_MESSAGE_SENT` (sem corpo da mensagem)

### Fase 4 — Campanhas (bloqueado: contrato + escopo produto)

- Listar campanhas e status
- Criar campanha (nome, mensagem, lista de destinatários)
- Pausar/cancelar
- Barra de progresso se API expuser fila

---

## 5. Fora de escopo (v1 do console)

- Inbox / conversas bidirecionais (chat CRM removido — ADR-001)
- Vincular/desvincular `wa_tenant_id` (superadmin `/admin` — ADR-005)
- Sincronização bidirecional CRM `contacts` ↔ contatos WA (avaliar fase futura)
- Webhooks CRM → WA (R-002 aberto)
- Edição de `label` em `workspace_integrations` pelo usuário final

---

## 6. Plano por camadas (Clean Architecture + MVVM)

### 6.1 Tipos (`src/types/wa-*.ts`)

Definir após contratos do backend — **não adivinhar shapes**. Placeholders na fase 1 só para
connection (já tipado em integrations).

### 6.2 Repository (`src/repositories/wa-*.repository.ts`)

- `WaConnectionRepository` — alias/refactor do que existe em settings
- `WaGroupsRepository` — fase 2
- `WaMessagesRepository` — fase 3
- `WaCampaignsRepository` — fase 4

Todos usam `waBackendFetch` + resolução de `tenant_id`/`instance_id` server-side.

### 6.3 Use cases (`src/usecases/Wa*UseCases.ts`)

Orquestram validação Zod, chamada ao repository, mapeamento de erro.

### 6.4 Server Actions (`src/app/(dashboard)/whatsapp/*-actions.ts`)

- `requireAuth` + `getWorkspaceContext` + `getScopedSupabaseClient`
- Gate de permissão (§3.3)
- `resolveWaBinding(workspaceId, instanceId?)` — anti-IDOR

### 6.5 ViewModels (`src/viewmodels/useWa*ViewModel.ts`)

Estado UI, polling onde necessário (status conexão), `toast` em mutações.

### 6.6 UI (`src/components/whatsapp/**`)

Por módulo; seguir design system existente (settings integrations como referência visual).

---

## 7. Rotas

| Rota | Componente | Fase |
|------|------------|------|
| `/whatsapp` | redirect → `/whatsapp/conexao` | 1 |
| `/whatsapp/conexao` | `WhatsAppConnectionPage` | 1 |
| `/whatsapp/grupos` | `WhatsAppGroupsPage` | 2 |
| `/whatsapp/grupos/[groupId]` | `WhatsAppGroupDetailPage` | 2 |
| `/whatsapp/enviar` | `WhatsAppSendMessagePage` | 3 |
| `/whatsapp/campanhas` | `WhatsAppCampaignsPage` | 4 |

Layout compartilhado: título "WhatsApp", tabs ou sub-nav horizontal opcional (mobile).

---

## 8. Permissões (migration futura)

Nova migration (número TBD) deve:

1. Inserir 5 chaves em `permissions` (ver ADR-008 §4)
2. Estender `seed_workspace_system_roles`
3. Re-seedar workspaces existentes
4. Atualizar `custom_access_token_hook` para incluir novas chaves em `perms`

Atualizar `.sdds/contracts/authz-claims.md` com catálogo estendido (v1 — só adição de chaves,
sem bump de `v`).

---

## 9. Critérios de aceite

### Fase 1
- [x] Sidebar mostra WhatsApp só com integração vinculada
- [x] `/whatsapp/conexao` reproduz funcionalidade v2.3 (status, QR, perfil, privacidade, foto)
- [ ] QR conexão/reconexão continua funcionando (regressão zero — validar manualmente)
- [x] Settings → Integrações aponta para novo caminho
- [ ] tsc limpo; testes BFF existentes passando

### Fase 2+
- [ ] Tipos gerados/alinhados ao contrato exportado pelo backend
- [ ] Gate por permissão conforme §3.3
- [ ] IDOR: `instance_id` de outro workspace → 403 genérico
- [ ] Auditoria em mutações sem PII

---

## 10. Dependências externas

| Dependência | Responsável | Artefato |
|-------------|-------------|----------|
| Contratos group-management | Backend WA | `backend_zapi/REQUEST-operational-contracts-...md` |
| Contratos envio mensagem | Backend WA | idem |
| Contratos campanhas | Backend WA | idem |
| Correção doc `/qrcode` (`value`) | Backend WA | `wa-backend-integration-contracts.md` §1.4 |
| Gate backend lê novas perms | Backend WA | Fase 2 authz no repo WA |

---

## 12. Backlog de produto (classificação CRM vs backend WA)

Registrado em 2026-06-15 após alinhamento com o produto. Recado operacional **já enviado**
ao backend (`backend_zapi/REQUEST-operational-contracts-groups-messages-campaigns.md`).

| # | Requisito | Dono | Fase / nota |
|---|-----------|------|-------------|
| 1 | Perfil membro: primeiro+segundo nome, celular, checar WhatsApp no endpoint | **Ambos** | CRM: schema `profiles` + UI; WA: `phone/check-whatsapp` |
| 2 | Config campanhas + janela horário; fila pausa/reprograma worker | **Backend** (motor) + **CRM** (UI config) | Fase 4 + contratos |
| 3 | Opção incluir nome do usuário no envio (padrão: primeiro+segundo) | **CRM** (composição) + WA (envio) | Fase 3 |
| 4 | Foto do usuário via WhatsApp; capturar link foto do contato colaborador | **Ambos** | CRM exibe; WA busca foto Z-API |
| 5 | Cadastro telefones colaborador (admin/gerente); lista de exceções | **CRM** | Nova tabela + RLS; spec futura |
| 6 | Tags CRM por categoria (origem, tipo, região, VIP…) | **CRM** | Evoluir além de `contact_sources` |
| 7 | Testar campanha só para colaboradores | **Ambos** | Fase 4 |
| 8 | Template + OpenAI (A.I.D.A.) por tipo de campanha | **CRM** (IA) + WA (disparo) | Fase 4; `OPENAI_API_KEY` server-only |
| 9 | Disparos fora do chat; aba “disparos em andamento” | **CRM** | `/whatsapp/campanhas` + sub-rota disparos |
| 10 | Sidebar WhatsApp se workspace habilitado | **CRM** | **Fase 1 — implementada** |
| 11 | Primeiro login: OTP/senha via WhatsApp | **Ambos** | Recado complementar auth WA |
| 12 | MFA obrigatório todos os perfis | **CRM** | Estender cookie/redirect existente |
| 13 | Header: avatar + dropdown perfil; telefone com código WA | **Ambos** | CRM UI; WA envio/validação código |

### Recado backend complementar (sugerido)

Itens **1, 4, 11, 13** exigem endpoints de verificação/OTP WhatsApp — pedir em recado
separado se não vier no pacote de campanhas.

---

## 13. Referências

- `specs/settings-integrations.spec.md` (v2.3 — origem da UI de conexão)
- `harness/settings-integrations.harness.md` (cenários BFF reutilizáveis)
- `decisions/ADR-008-whatsapp-console-sidebar.md`
- `backend_zapi/frontend_v3/` — bundle atual (só management + account-settings)
