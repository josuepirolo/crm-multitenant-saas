# Integrações WhatsApp (tela do usuário final) — Harness

Módulo: settings (sub-feature: integrations)
Data: 2026-06-12
Status: SPEC — não implementado (harness define os cenários antes do código)

---

## 1. Cenários obrigatórios

| ID | Cenário | Tipo | Cobertura prevista |
|---|---|---|---|
| SI-01 | Owner/admin vê a aba "Integrações" em `/settings` | Happy path | Manual |
| SI-02 | Lista exibe as integrações WhatsApp do workspace autenticado (label, status, provider, data) | Happy path | Manual + automatizado |
| SI-03 | Workspace sem integração mostra empty state com CTA de contato (sem botão de "conectar") | Alternativo | Manual |
| SI-04 | Erro de carregamento mostra mensagem genérica + botão "Tentar novamente" | Alternativo | Manual |
| SI-05 | `workspace_id` sempre do contexto autenticado — nunca do client | Segurança | Teste automatizado |
| SI-06 | Isolamento multi-tenant: workspace A não vê integração de workspace B | Segurança | Teste automatizado |
| SI-07 | Action usa `getScopedSupabaseClient()` (R-009) — sem `createClient()` cru | Segurança | Teste automatizado |
| SI-08 | Membro sem role owner/admin é bloqueado na action | Segurança | Teste automatizado |
| SI-09 | Resposta/bundle nunca contém `credentials`/`webhook_secret`/`provider_credentials` | Segurança | Teste automatizado |
| SI-10 | Nenhum caminho desta tela escreve em `wa_*` (ADR-001) | Segurança | Revisão + automatizado |
| SI-11 | Vincular/desvincular `wa_tenant_id` NÃO é possível por esta tela (só /admin) | Segurança | Revisão de código |
| SI-12 | Skeleton fiel ao layout durante carregamento | UI | Manual |
| SI-13 | Dark mode e responsivo (375px / 1280px+) | UI | Manual |
| SI-14 | (Se §8-B adotado) edição de `label` por owner/admin gera audit `INTEGRATION_UPDATED` (source: user) e não toca `wa_tenant_id`/`provider`/`status` | Segurança | Teste automatizado |

---

## 1b. Cenários v2 — BFF de gestão de instância ([[ADR-006]])

| ID | Cenário | Tipo | Cobertura prevista |
|---|---|---|---|
| BFF-01 | Client (browser) **nunca** chama `WA_BACKEND_URL` direto — só via Server Action do CRM | Segurança | Revisão + busca no bundle (`WA_BACKEND_URL` não aparece no client) |
| BFF-02 | Action repassa o `access_token` do **próprio usuário** como Bearer (sem `service_role`, sem secret novo) | Segurança | Teste automatizado |
| BFF-03 | `WA_BACKEND_URL` ausente → feature degrada com erro genérico (não quebra a página) | Alternativo | Teste automatizado |
| BFF-04 | `instance_id`/`tenant_id` pedido é validado como pertencente ao workspace autenticado antes de repassar (anti-IDOR) | Segurança | Teste automatizado |
| BFF-05 | Leitura (listar/status/QR) exige `settings:view`; membro sem permissão é bloqueado na action | Segurança | Teste automatizado |
| BFF-06 | Mutação (restart/disconnect/perfil/privacidade) exige `settings:edit`; bloqueado caso contrário | Segurança | Teste automatizado |
| BFF-07 | Backend WA responde 401/403 → erro amigável "sem acesso, falar com suporte" (gap membership) | Alternativo | Teste automatizado |
| BFF-08 | QR com número já conectado (409) → "número já conectado", sem QR | Alternativo | Teste automatizado |
| BFF-09 | Timeout/5xx do backend WA → "serviço indisponível", sem stack/corpo bruto vazado | Segurança | Teste automatizado |
| BFF-10 | Nenhum log contém `access_token`, QR (base64) ou `credentials` | Segurança | Revisão + teste de logger |
| BFF-11 | Mutação gera `createAuditLog` (`source: "user"`) sem payload sensível | Segurança | Teste automatizado |
| BFF-12 | Status ao vivo + QR Dialog renderizam com skeleton/empty/error; dark mode e mobile OK | UI | Manual |

---

## 2. Arquivos de teste previstos

- `src/tests/tenant-isolation/workspace-integration-view.test.ts` (novo) — SI-02, SI-05, SI-06, SI-07, SI-08, SI-09, SI-14
- `src/tests/security/wa-backend-bff.test.ts` (novo) — BFF-02..BFF-11
- Revisão manual/estática — SI-10, SI-11, BFF-01, BFF-10
- Testes manuais de UI — SI-01, SI-03, SI-04, SI-12, SI-13, BFF-12

---

## 3. Resultado da última execução

- Data: 2026-06-13
- Resultado: **v2.1 + v2.2 IMPLEMENTADAS** (listar + status ao vivo + QR + restart/disconnect).
  Insumos destravados pelo bundle `backend_zapi/frontend/`: `WA_BACKEND_URL = https://messageapi.py.tec.br`
  + contratos completos de `management-instances`/`account-settings`.
- Automatizados (`src/tests/security/wa-backend-bff.test.ts`, 16 testes): BFF-02 (repasse do JWT),
  BFF-03 (não configurado), BFF-04 (anti-IDOR tenant∉workspace + UUID inválido), BFF-05 (gate view),
  BFF-06 (gate edit, sem auditoria ao bloquear), BFF-07 (403→amigável), BFF-08 (409 QR→alreadyConnected),
  BFF-09 (timeout/5xx→indisponível), BFF-11 (auditoria de mutação sem token). Suíte total 400/400.
- Pendente manual (BFF-12 / SI-12,13): renderização da aba, QR Dialog, dark mode e mobile em navegador.
- Pendente: v2.3 (perfil/privacidade — account-settings) e os testes de tenant-isolation `SI-*`
  (view read-only via RLS), se a v1 read-only ainda for desejada como fallback.
