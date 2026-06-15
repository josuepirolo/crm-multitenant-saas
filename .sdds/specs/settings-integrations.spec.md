# Integrações WhatsApp — tela do usuário final (`/settings/integrations`) — Spec

Módulo: settings (sub-feature: integrations)
Versão: 2.0 (v1 read-only via RLS → v2 BFF de gestão de instância, ver §11 e [[ADR-006]])
Data: 2026-06-13
Status: SPEC

> **v2 (BFF) — decisão do produto em 2026-06-13:** a tela passa a consumir a API REST do
> backend WhatsApp como **BFF** (Server Action repassa o JWT do usuário), destravando status real,
> QR Code e perfil/privacidade — não só a leitura de `workspace_integrations` via RLS. A arquitetura
> dessa evolução está em **[[ADR-006]]**; os cenários, em `harness/settings-integrations.harness.md`.
> As seções §1–§10 abaixo descrevem a **v1 read-only** (continua válida como fallback quando
> `WA_BACKEND_URL` não está configurada ou o backend WA está fora). A **§11** descreve a v2.

---

## 1. Objetivo

Dar ao **owner/admin de um workspace** uma tela em `/settings` onde ele **vê** quais instâncias WhatsApp estão conectadas ao seu workspace, com status e identificação amigável — sem nunca poder escolher, trocar ou desvincular a instância (`wa_tenant_id`), que é responsabilidade exclusiva do superadmin via `/admin` (ver [[ADR-005]]).

A tela é a contraparte de leitura, para o cliente final, do painel admin já implementado em `WorkspaceIntegrationsSection`.

---

## 2. Contexto e restrições herdadas

- **[[ADR-001]]** — CRM é agnóstico ao provider WA; o backend WA é fonte de verdade. O CRM **nunca** escreve em `wa_*` e **nunca** lê `credentials`/`webhook_secret`/`provider_credentials`.
- **[[ADR-005]]** — o vínculo `workspace_id ↔ wa_tenant_id` é 1:N (um workspace, várias instâncias), com `UNIQUE(wa_tenant_id)` garantindo o inverso 1:1. Vincular/desvincular/escolher `wa_tenant_id` e `provider` é **exclusivo do superadmin** — escolher a instância errada quebraria o isolamento entre CRM e backend WA. Logo, **essas operações estão fora do escopo desta tela.**
- **R-009 / `getScopedSupabaseClient()`** — toda Server Action desta tela resolve o cliente Supabase via o padrão já consolidado, derivando `workspace_id` do contexto autenticado (`getWorkspaceContext`), nunca do client.

### Restrição de RLS que molda o escopo (importante)

A migration `20260520000001_workspace_integrations.sql` dá aos membros do workspace `SELECT` em `workspace_integrations` (e `FOR ALL` a owner/admin). **Porém** `wa_tenants`/`wa_instances` pertencem ao domínio WA e **não são legíveis por membros comuns via RLS** — hoje só o `service_role` (admin) as lê (ver `SupabaseWorkspaceIntegrationRepository.listByWorkspace`).

Consequência: a tela do usuário final, lendo via RLS, **só tem acesso garantido aos campos de `workspace_integrations`** (`label`, `status`, `provider_id`, `integration_type`, `created_at`). Nome da instância (`wa_tenants.display_name`) e contagem de instâncias (`wa_instances`) exigem leitura cross-domain — tratada como item opcional via caminho controlado (ver §6).

---

## 3. Escopo (v1)

- Nova aba **"Integrações"** em `/settings` (`SettingsTabs`), visível para owner/admin.
- Listagem **somente-leitura** das integrações WhatsApp do workspace autenticado, com, por linha:
  - `label` (nome amigável, ou fallback "Instância WhatsApp")
  - badge de `status` (`active` = "Conectado", `inactive` = "Pausado", `pending` = "Aguardando conexão")
  - `provider_id` exibido como nome legível (ex.: `zapi` → "Z-API")
  - data de criação do vínculo
- **Empty state** quando o workspace não tem nenhuma integração: mensagem clara de que a conexão é feita pelo suporte/admin, com CTA de contato — **sem** botão de "conectar" (linking é superadmin-only).
- Estados completos: skeleton de carregamento, empty, error com retry.
- Auditoria de leitura **não** é necessária (operação de leitura sem mutação).

---

## 4. Fora de escopo (v1)

- **Vincular / desvincular / trocar instância (`wa_tenant_id`) ou provider** — exclusivo do superadmin via `/admin` ([[ADR-005]]).
- Edição de `label` pelo usuário final — **decisão aberta** (ver §8); default v1 = não editável.
- Exibir QR Code / fluxo de pareamento do número WhatsApp — pertence ao backend WA, fora do CRM ([[ADR-001]]).
- Métricas de mensagens/conversas — Chat não implementado.
- Integrações não-WhatsApp (email, instagram) — o schema suporta (`integration_type`), mas v1 cobre só `whatsapp`.

---

## 5. Comportamento desejado

1. Usuário (owner/admin) abre `/settings` → aba "Integrações".
2. Tela busca as integrações WhatsApp do **workspace do contexto autenticado** (nunca id vindo do client).
3. Se houver vínculos: lista cards/linhas read-only com label, status, provider e data.
4. Se não houver: empty state orientando a falar com o suporte/admin para conectar.
5. Erro de carregamento → mensagem genérica + botão "Tentar novamente".

---

## 6. Plano por camadas (Clean Architecture + MVVM)

### 6.1 Entidade de domínio (`src/types/index.ts`)
- Reaproveitar `WorkspaceIntegration`, `IntegrationStatus` já existentes.
- Novo tipo de view enxuto para o usuário final, **sem campos sensíveis**:
  ```ts
  export interface WorkspaceIntegrationView {
    id: string;
    label: string | null;
    status: IntegrationStatus;
    provider_id: string | null;
    integration_type: string;
    created_at: string;
    // opcional (caminho controlado, ver 6.4): wa_instance_count?: number;
  }
  ```

### 6.2 Repository (`src/repositories/workspace-integration.repository.ts`)
- Adicionar método de leitura escopada por workspace que retorna **apenas** colunas de `workspace_integrations` (sem join em `wa_*`):
  ```ts
  listViewByWorkspace(workspaceId: string): Promise<WorkspaceIntegrationView[]>
  ```
- Reusa a mesma classe; este método **não** lê `wa_tenants`/`wa_instances` (compatível com RLS do membro).

### 6.3 UseCase (`src/usecases/WorkspaceIntegrationUseCases.ts`)
- `ListWorkspaceIntegrationsViewUseCase` — recebe `workspaceId`, chama `listViewByWorkspace`.

### 6.4 Server Actions (`src/app/(dashboard)/settings/integrations-actions.ts`)
- `listMyWorkspaceIntegrations()`:
  - `getWorkspaceContext()` → `{ workspaceId, role }`; exigir `role ∈ {owner, admin}` (ou permissão equivalente via `can()`).
  - `getScopedSupabaseClient()` (R-009) → repo → usecase.
  - Retorna `{ error?, integrations }` no padrão do projeto; erro genérico via `publicError`.
- **Opcional (contagem de instâncias):** se for desejável mostrar `wa_instance_count`, criar uma RPC `SECURITY DEFINER` (`count_wa_instances_for_workspace(workspace_id)`) que valida `workspace_id ∈ my_workspace_ids()` e retorna **só o número** — nunca expõe linhas de `wa_*`. Sem essa RPC, a contagem fica fora da v1. Esta escolha é **decisão arquitetural** e, se adotada, deve virar ADR.

### 6.5 ViewModel (`src/viewmodels/useSettingsIntegrationsViewModel.ts`)
- Estado: `loading`, `error`, `integrations`.
- `useEffect` inicial chama `listMyWorkspaceIntegrations()`.
- `reload()` para o botão de retry.

### 6.6 Componentes (`src/components/settings/integrations/`)
- `IntegrationsTab` — orquestra estados (skeleton/empty/error/lista).
- `IntegrationCard` — linha read-only (label, status badge, provider, data).
- `IntegrationsEmptyState` — ilustração + texto + CTA de contato.
- `IntegrationsSkeleton` — fiel ao layout das linhas.
- Integrar como nova aba em `src/components/settings/settings-tabs.tsx`.

### 6.7 Validação Zod
- Nenhum input de mutação na v1 → nenhum schema novo necessário (a menos que §8 habilite edição de label, daí reusar `updateWorkspaceIntegrationSchema` restrito a `label`).

### 6.8 UI / Performance (skills obrigatórias)
- Tokens CSS apenas (sem cor hardcoded); dark mode.
- Skeleton no carregamento; empty com ação; error com retry.
- Badges de status com cor semântica (`active`→success, `pending`→warning, `inactive`→muted).
- Responsivo (375px / 1280px+); animação de entrada Framer Motion (stagger 50ms).
- Leitura só (sem mutação) → não precisa de `toast.promise`; se §8 habilitar edição de label, aí sim otimista + `toast.promise`.

---

## 7. Segurança (checklist)

- [ ] `workspace_id` sempre do contexto autenticado (`getWorkspaceContext`), nunca do client.
- [ ] `getScopedSupabaseClient()` (R-009) — sem `createClient()` cru nesta rota.
- [ ] Action exige `role ∈ {owner, admin}` antes de retornar dados.
- [ ] Nenhum campo sensível (`credentials`, `webhook_secret`, `provider_credentials`) lido ou retornado.
- [ ] Nenhuma escrita em `wa_*` ([[ADR-001]]).
- [ ] Erros genéricos via `publicError` (sem stack trace ao client).
- [ ] RLS de `workspace_integrations` permanece a última barreira (read scoped por workspace).

---

## 8. Decisão aberta — edição de `label` pelo usuário final

`label` é puramente cosmético e **não** afeta isolamento de tenant. Há duas posturas:

- **(A) Read-only total (default v1)** — coerente com a leitura literal do [[ADR-005]] ("gestão exclusiva via /admin"). Mais simples, zero superfície de escrita.
- **(B) Permitir owner/admin editar só o `label`** — melhora UX (cliente nomeia "Vendas SP" sozinho) sem tocar em `wa_tenant_id`/`provider`/`status`. Exige: Server Action `updateMyIntegrationLabel` com `getScopedSupabaseClient`, validação Zod restrita a `label`, auditoria `INTEGRATION_UPDATED` (source: "user"), e a RLS `FOR ALL` de owner/admin já existente cobre o UPDATE.

**Recomendação:** começar com (A) e promover para (B) se o usuário pedir. Se (B) for adotado, registrar como addendum no [[ADR-005]].

---

## 9. Critério de pronto (v1)

- Aba "Integrações" aparece em `/settings` para owner/admin.
- Lista as integrações WhatsApp do workspace correto (validado por teste de isolamento — workspace A não vê integração de B).
- Empty/skeleton/error implementados; dark mode e mobile OK.
- Nenhum caminho de escrita em `wa_*`; nenhum campo sensível exposto no bundle/resposta.
- `tsc --noEmit` limpo; suíte de segurança/tenant-isolation continua verde.
- Documentação: README (se a feature for citada) e este spec atualizados; INDEX.md aponta para o spec.

---

## 10. Arquivos previstos

| Camada | Arquivo |
|---|---|
| Tipos | `src/types/index.ts` (+`WorkspaceIntegrationView`) |
| Repository | `src/repositories/workspace-integration.repository.ts` (+`listViewByWorkspace`) |
| UseCase | `src/usecases/WorkspaceIntegrationUseCases.ts` (+`ListWorkspaceIntegrationsViewUseCase`) |
| Server Action | `src/app/(dashboard)/settings/integrations-actions.ts` (novo) |
| ViewModel | `src/viewmodels/useSettingsIntegrationsViewModel.ts` (novo) |
| Componentes | `src/components/settings/integrations/*` (novo) |
| Aba | `src/components/settings/settings-tabs.tsx` (editar) |
| (opcional) RPC | `supabase/migrations/<ts>_count_wa_instances_for_workspace.sql` (só se §6.4 opcional for adotado) |

---

## 11. Evolução v2 — BFF de gestão de instância ([[ADR-006]])

### 11.1 Objetivo da v2
Além de listar os vínculos (v1), dar ao owner/admin os dados **reais** da conexão WhatsApp
(status, QR de pareamento) e, em fase posterior, gestão (restart/disconnect) e perfil/privacidade —
consumindo a API REST do backend WA via **BFF**, já que `wa_*` não é legível por RLS ao membro.

### 11.2 Princípios herdados de [[ADR-006]]
- Client **nunca** chama o backend WA direto; tudo passa por Server Action/Route Handler do CRM.
- A action repassa o **`access_token` do próprio usuário** como `Bearer` (sem secret novo, sem
  `service_role`). Autorização final é do backend WA (`wa_tenant_members`).
- Base URL em `WA_BACKEND_URL` (server-only). Ausente → feature degrada com erro genérico.
- `workspace_id` do contexto autenticado; `wa_tenant_id`/`instance_id` resolvidos e **validados**
  no servidor (pertencem ao workspace via `workspace_integrations`) — defesa contra IDOR.
- **RBAC do CRM por cima**: leitura → `settings:view`; mutação → `settings:edit` (módulo `settings`,
  pois não há `PermissionModule` "integrations"). Backend WA é mais permissivo (qualquer role);
  o CRM restringe.
- Erros não-2xx do backend → genéricos (`publicError`): `401/403` → "sem acesso, falar com suporte";
  `409` QR → "número já conectado"; `5xx`/timeout → "serviço indisponível". Nunca vaza corpo/stack/
  token. Timeout via AbortController.
- Mutações auditadas (`source: "user"`), sem payload sensível. Nada de token/QR/credentials em log.

### 11.3 Faseamento da v2
- **v2.1 (leitura/pareamento) — IMPLEMENTADO 2026-06-13** — listar instâncias + status ao vivo
  (polling 20s) + QR Code (`QrCodeDialog`, polling 4s, 409 = já conectado). Endpoints:
  `GET /management/tenants/{tenant_id}/instances`, `GET /management/instances/{id}/status`,
  `GET /management/instances/{id}/qrcode`. Gate `settings:view`.
- **v2.2 (gestão) — IMPLEMENTADO 2026-06-13** — `POST .../restart`, `POST .../disconnect`,
  gate `settings:edit` + auditoria (`WA_INSTANCE_RESTARTED`/`WA_INSTANCE_DISCONNECTED`).
- **v2.3a (perfil + privacidade-leitura) — IMPLEMENTADO 2026-06-14** — `WaAccountDialog` (botão
  "Perfil" no card de instância conectada): `GET .../profile` + editar `name`/`description`
  (`PUT .../profile/{field}`, gate `settings:edit`, auditoria `WA_PROFILE_UPDATED` sem o valor) +
  `GET .../privacy` (exibição read-only dos 8 controles). Camadas: repo `getProfile`/`updateProfileField`/
  `getPrivacy`, usecases `Get/UpdateWaProfile*`/`GetWaPrivacy`, actions com anti-IDOR, `useWaAccountViewModel`.
  6 testes novos em `wa-backend-bff.test.ts`. `perms`: leitura=`connection:view`(settings:view), edição=`account:edit`(settings:edit).
- **v2.3b (edição de privacidade + foto) — IMPLEMENTADO 2026-06-14** — `WaPrivacySection` editável no
  `WaAccountDialog`: `read-receipts` (Ativado/Desativado), `messages-duration` (select), e os 5 controles
  de visibilidade (`last-seen`/`photo`/`description`/`online` + `group-add`) como ALL/NONE/CONTACT_BLACKLIST
  — com `BlacklistEditor` inline (add/remove de contatos via `GET .../privacy/disallowed-contacts` +
  `PUT` com `contactsBlacklist`); `online` só ALL/NONE (sem disallowed). Foto: **upload** (`POST .../media/uploads`
  multipart → `PUT .../profile/picture` com o caminho retornado) **ou URL**. Camadas: client `waBackendUpload`,
  repo (`updateVisibility`/`updateGroupAdd`/`updateReadReceipts`/`updateMessagesDuration`/`getDisallowedContacts`/
  `uploadMedia`), usecases, actions (gate `settings:edit`, Zod, anti-IDOR, auditoria `WA_PRIVACY_UPDATED`/
  `WA_PROFILE_UPDATED` sem PII), VM handlers. 10 testes novos (`wa-backend-bff.test.ts`, suíte 417/417, tsc limpo).
  > `group-add` usa a chave `type` (não `visualizationType`); CONTACT_BLACKLIST exige `contactsBlacklist`
  > não-vazia (validado). Resposta de `media/uploads` lida defensivamente (`media_url`/`file_path`/`path`/`url`).

> **Reconciliação confirmada (2026-06-13):** o gate de papel do backend WA bate **exatamente** na
> permissão `settings` existente — read (owner/admin/manager) = `settings:view`; write (owner/admin)
> = `settings:edit`. `WA_BACKEND_URL = https://messageapi.py.tec.br`. Auth = mesmo JWT Supabase da
> sessão (não há login separado). 16 testes em `src/tests/security/wa-backend-bff.test.ts`;
> suíte 400/400; `tsc` limpo.

### 11.4 Camadas (Clean Arch + MVVM) da v2
- **Infra** `src/lib/wa-backend/client.ts` — fetch genérico: base URL de `WA_BACKEND_URL`, injeta
  `Bearer <jwt>`, `AbortController` (timeout), mapeia non-2xx para erro tipado, **nunca loga token**.
  Helper `getUserAccessToken()` (server-side, via `supabase.auth.getSession()`).
- **Repository** `src/repositories/wa-management.repository.ts` — `IWaManagementRepository` +
  impl que usa o client; um método por endpoint. (Tipos exatos das respostas **aguardam os contratos
  do backend** — `.sdds/contracts/management-instances.md`/`account-settings.md` do repo do backend.)
  Resolver auxiliar (Supabase, contract-independent): `listWaTenantIdsByWorkspace(workspaceId)` em
  `workspace-integration.repository.ts`.
- **UseCases** `src/usecases/WaManagementUseCases.ts` — `ListWaInstancesUseCase`,
  `GetWaInstanceStatusUseCase`, `GetWaInstanceQrCodeUseCase` (v2.2/2.3 depois).
- **Server Actions** `src/app/(dashboard)/settings/integrations-actions.ts` — gate via
  `getWorkspaceContext("settings", "view"|"edit")`; resolve+valida `instance_id ∈ workspace`;
  obtém JWT; chama usecase; retorna `{ error?, data }`.
- **ViewModel** `useSettingsIntegrationsViewModel` — estado por instância (status/qr/loading/error),
  `reload()`, polling opcional do status enquanto "conectando".
- **Componentes** `src/components/settings/integrations/*` — `IntegrationCard` ganha status badge ao
  vivo + botão "Conectar"/"Ver QR"; `QrCodeDialog`; (v2.2) ações restart/disconnect com confirmação +
  `toast.promise`.

### 11.5 Gap conhecido (ver [[ADR-006]])
Membro do workspace CRM pode **não** ser `wa_tenant_members` no backend → 403 legítimo. Tratar como
erro amigável; fechar o gap é trabalho do backend WA (sincronizar membership), fora do CRM.

### 11.6 Pendências bloqueantes da v2 (insumos externos)
1. **`WA_BACKEND_URL`** — host do backend WA (deploy). Sem isso, só a infra contract-independent é
   construível; chamadas reais não funcionam.
2. **Contratos** dos endpoints (`management-instances.md`/`account-settings.md` do repo do backend) —
   sem os schemas de `/status` e `/qrcode`, tipar respostas e a UI seria adivinhar JSON.
