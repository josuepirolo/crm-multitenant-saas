# Console WhatsApp — Harness

Módulo: whatsapp (console operacional)
Data: 2026-06-15
Status: FASE 1 IMPLEMENTADA — fases 2–4 aguardando contratos backend

---

## 1. Cenários — Fase 1 (Sidebar + Conexão)

| ID | Cenário | Tipo | Cobertura |
|---|---|---|---|
| WC-01 | Sidebar mostra seção WhatsApp quando workspace tem ≥1 `workspace_integrations` do tipo `whatsapp` | Happy path | Manual |
| WC-02 | Sidebar NÃO exibe seção WhatsApp quando workspace sem vínculo | Alternativo | Manual |
| WC-03 | Subitem "Conexão" navega para `/whatsapp/conexao` | Happy path | Manual |
| WC-04 | `/whatsapp/conexao` reproduz funcionalidade v2.3: status, QR, perfil, privacidade, foto | Happy path | Manual (validado 2026-06-15) |
| WC-05 | QR de conexão/reconexão funciona sem regressão (lê `value`, renderiza localmente) | Happy path | Manual (validado 2026-06-15) |
| WC-06 | Settings → aba Integrações exibe banner com link para `/whatsapp/conexao` | Happy path | Manual |
| WC-07 | Sidebar collapsed (desktop): ícone único MessageSquare; link aponta para `/whatsapp/conexao` | UI | Manual |
| WC-08 | Drawer mobile: hierarquia com indentação nos subitens | UI | Manual |
| WC-09 | `workspaceHasWhatsAppIntegration()` usa `getScopedSupabaseClient()` — nunca `createClient()` cru | Segurança | Revisão de código |
| WC-10 | `workspace_id` sempre do contexto autenticado; `instance_id` validado via `workspace_integrations` (anti-IDOR) | Segurança | Teste automatizado (herdado BFF-04) |
| WC-11 | Client (browser) nunca chama `WA_BACKEND_URL` direto — só via Server Action | Segurança | Revisão de bundle |
| WC-12 | Dark mode e responsivo (375px / 1280px+) | UI | Manual |
| WC-13 | Skeleton / error state em `/whatsapp/conexao` (herdado de integrations v2.3) | UI | Manual |
| WC-14 | `tsc --noEmit` limpo; suíte BFF 33/33 passando | Sanidade | Automatizado (CI) |

---

## 2. Cenários — Fase 2 (Grupos) — BLOQUEADO

> Aguardando contratos operacionais do backend (`backend_zapi/REQUEST-operational-contracts-groups-messages-campaigns.md`).

| ID | Cenário | Tipo | Status |
|---|---|---|---|
| WC-20 | Listagem de grupos do tenant (paginada) | Happy path | PENDENTE |
| WC-21 | Criar grupo (nome, descrição, participantes) | Happy path | PENDENTE |
| WC-22 | Detalhe do grupo: participantes, promover/rebaixar admin | Happy path | PENDENTE |
| WC-23 | Seletor de instância quando N vínculos | Alternativo | PENDENTE |
| WC-24 | IDOR: `instance_id` de outro workspace → 403 genérico | Segurança | PENDENTE |
| WC-25 | Auditoria `WA_GROUP_CREATED`/`UPDATED`/`MEMBER_CHANGED` sem PII | Segurança | PENDENTE |
| WC-26 | Gate `integration.whatsapp.groups:view`/`:manage` por role | Segurança | PENDENTE |

---

## 3. Cenários — Fase 3 (Enviar mensagem) — BLOQUEADO

| ID | Cenário | Tipo | Status |
|---|---|---|---|
| WC-30 | Formulário: instância, destino E.164, texto, anexo opcional | Happy path | PENDENTE |
| WC-31 | Auditoria `WA_MESSAGE_SENT` sem corpo da mensagem | Segurança | PENDENTE |
| WC-32 | Gate `integration.whatsapp.messages:send` | Segurança | PENDENTE |

---

## 4. Cenários — Fase 4 (Campanhas) — BLOQUEADO

| ID | Cenário | Tipo | Status |
|---|---|---|---|
| WC-40 | Listar campanhas e status | Happy path | PENDENTE |
| WC-41 | Criar campanha (nome, mensagem, lista de destinatários) | Happy path | PENDENTE |
| WC-42 | Pausar/cancelar campanha | Alternativo | PENDENTE |
| WC-43 | Gate `campaigns:view`/`:manage` | Segurança | PENDENTE |

---

## 5. Arquivos de teste previstos

- Fase 1: revisão estática (WC-09, WC-11) + manual (WC-01..WC-08, WC-12, WC-13) + CI (WC-14)
- Fase 2–4: a definir após recebimento dos contratos do backend

---

## 6. Resultado da última execução

- Data: 2026-06-15
- tsc: limpo
- vitest (BFF): 33/33 passando
- Validação manual QR: conexão + reconexão OK
- Fases 2–4: BLOQUEADAS (sem contratos do backend)
