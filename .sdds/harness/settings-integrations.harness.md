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

## 2. Arquivos de teste previstos

- `src/tests/tenant-isolation/workspace-integration-view.test.ts` (novo) — SI-02, SI-05, SI-06, SI-07, SI-08, SI-09, SI-14
- Revisão manual/estática — SI-10, SI-11
- Testes manuais de UI — SI-01, SI-03, SI-04, SI-12, SI-13

---

## 3. Resultado da última execução

- Data: —
- Resultado: não implementado (spec aprovada, aguardando implementação)
- Observação: escopo pode expandir se o backend WA expuser endpoints de administração consumíveis pelo CRM como BFF (a confirmar com contrato dos endpoints).
