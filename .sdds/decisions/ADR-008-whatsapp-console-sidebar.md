# ADR-008 — Console WhatsApp no sidebar (grupos, mensagens, campanhas)

## Data
2026-06-15

## Status
ACEITO — **fase 1 implementada** (sidebar + `/whatsapp/conexao`); fases 2–4 bloqueadas por
contratos operacionais do backend WA (ver `backend_zapi/REQUEST-operational-contracts-groups-messages-campaigns.md`)

## Contexto

A integração WhatsApp v2 (ADR-006) vive hoje como aba **"Integrações"** em `/settings` — adequada
para **configuração** (status, QR, perfil/privacidade), mas insuficiente para **operação do dia a
dia** (gerenciar grupos, enviar mensagem, campanhas).

O backend WA já expõe routers operacionais (`group-management`, envio, campanhas) com gates
documentados em `backend_zapi/frontend_v3/frontend-whatsapp-integration.md` §2.3–§4, porém **sem**
contratos request/response exportados para o CRM — mesmo bloqueio que existia antes de v2.1 para
`management-instances`.

**Validação manual 2026-06-15:** o usuário confirmou que **conexão e reconexão via QR** funcionam
ponta a ponta (desconectar → gerar QR → escanear → conectar). O marco v2.3 de configuração está
fechado; a expansão para console operacional é o próximo passo de produto.

## Decisão

### 1. Nova seção no sidebar: **WhatsApp**

Item de menu de primeiro nível no dashboard (`src/components/dashboard/sidebar.tsx`), **visível
somente** quando o workspace autenticado tiver ≥1 vínculo em `workspace_integrations` com
`integration_type = 'whatsapp'` (qualquer `status`).

Subitens (rotas sob `/whatsapp/`):

| Subitem | Rota | Escopo |
|---------|------|--------|
| Conexão | `/whatsapp/conexao` | Reuso da UI v2.3 (status, QR, perfil/privacidade) — **migra** da aba Settings |
| Grupos | `/whatsapp/grupos` | Listar/criar/editar grupos; participantes e admins |
| Enviar mensagem | `/whatsapp/enviar` | Envio avulso (contato ou grupo) |
| Campanhas | `/whatsapp/campanhas` | Envio em massa — **fase 4** (pode entrar depois de grupos + envio) |

Padrão de navegação: submenu expansível (ícone `MessageCircle` ou similar), mesmo estilo visual
dos itens de nicho — `pathname.startsWith('/whatsapp')` para highlight.

### 2. Settings: aba Integrações vira alias

A aba **"Integrações"** em `/settings` **permanece** na v1 do console (evita quebrar bookmarks),
mas passa a **redirecionar** ou exibir banner "Gerencie em WhatsApp → Conexão" apontando para
`/whatsapp/conexao`. Implementação única de componentes — sem duplicar `WaInstancesList`,
`QrCodeDialog`, `WaAccountDialog`.

### 3. Mesmo padrão BFF (ADR-006)

Todos os módulos novos seguem o padrão já consolidado:

- Server Actions / Route Handlers — **nunca** chamada direta do browser ao `WA_BACKEND_URL`
- JWT do usuário repassado server-side (`waBackendFetch`)
- `wa_tenant_id` / `instance_id` resolvidos no servidor via `workspace_integrations` (anti-IDOR)
- Erros traduzidos (`publicError`), timeout, sem log de token/QR/conteúdo de mensagem
- Auditoria em mutações (`createAuditLog`, sem PII)

### 4. Novas permissões `integration.whatsapp.*` (extensão ADR-007)

O claim `authz` v1 hoje cobre só conexão/instância/conta. O console operacional exige chaves novas
no catálogo `permissions` + seed + hook (mesma migration pattern de `20260613190000`):

| Chave | Uso no CRM (gate local) | Operações WA alvo |
|-------|-------------------------|-------------------|
| `integration.whatsapp.groups:view` | Subitem Grupos (leitura) | GET grupos, metadata |
| `integration.whatsapp.groups:manage` | Grupos (escrita) | criar/editar, participantes, admins |
| `integration.whatsapp.messages:send` | Enviar mensagem | POST envio avulso |
| `integration.whatsapp.campaigns:view` | Campanhas (leitura) | listar/status |
| `integration.whatsapp.campaigns:manage` | Campanhas (escrita) | criar/pausar/cancelar |

**Matriz proposta (system roles CRM):**

| Role | groups:view | groups:manage | messages:send | campaigns:view | campaigns:manage |
|------|-------------|---------------|---------------|----------------|------------------|
| owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| sales | ✅ | ❌ | ✅ | ✅ | ❌ |
| support | ✅ | ❌ | ✅ | ✅ | ❌ |
| member | ✅ | ❌ | ❌ | ❌ | ❌ |

Alinha com `GROUP_READ_ROLES` / `GROUP_WRITE_ROLES` do backend hoje. **Coordenação obrigatória**
com o time WA para o backend passar a ler essas chaves no claim (Fase 2 do gate) — recado em
`backend_zapi/REQUEST-operational-contracts-groups-messages-campaigns.md`.

Até lá: CRM aplica gate local; backend mantém `tenant_auth` atual.

**Conexão/perfil** continuam nas 3 chaves existentes + gate `settings:view`/`edit` (ADR-006) até
decisão futura de migrar 100% para `integration.*` apenas.

### 5. Chat legado no sidebar

O item `/chat` no `BASE_NAV` permanece por ora (rota pode estar vazia/legada). Quando o console
WhatsApp estiver estável, avaliar remover ou redirecionar `/chat` → `/whatsapp/enviar` (decisão de
produto separada — não bloqueia esta ADR).

## Faseamento

| Fase | Entregável | Bloqueio |
|------|------------|----------|
| **0** | v2.3 settings integrations (conexão, QR, perfil) | ✅ Concluído — QR validado manualmente 2026-06-15 |
| **1** | Shell sidebar + `/whatsapp/conexao` (mover UI existente) | Nenhum — só refactor de rotas/layout |
| **2** | `/whatsapp/grupos` | Contrato `group-management` do backend |
| **3** | `/whatsapp/enviar` | Contrato envio de mensagem |
| **4** | `/whatsapp/campanhas` | Contrato campanhas + decisão de escopo |
| **5** | Migration permissões + backend lê novas chaves no claim | Acordo coordenado CRM ↔ WA |

## Consequências

**Positivas:**
- Separa config (settings) de operação (sidebar) — UX alinhada ao uso diário
- Reuso total da infra BFF/authz — não é "começar do zero"
- Permissões granulares por módulo WA no claim (extensão natural do ADR-007)

**Negativas:**
- Mais superfície de UI para manter e testar
- Depende de contratos externos (mesmo risco de drift do ADR-006)
- Duas entradas temporárias (settings + sidebar) até alias/consolidação

## Arquivos relacionados (previstos)

- `specs/whatsapp-console.spec.md` — spec detalhada por fase
- `src/components/dashboard/sidebar.tsx` — submenu WhatsApp
- `src/app/(dashboard)/whatsapp/**` — rotas e Server Actions por módulo
- `src/lib/wa-backend/client.ts` — reuso
- `backend_zapi/REQUEST-operational-contracts-groups-messages-campaigns.md` — recado ao backend
- `decisions/ADR-006-bff-wa-backend-management.md` · `ADR-007-autorizacao-cross-service-claims-jwt.md`
