# Sessão — 2026-05-22

Tipo: Revisão de estado / documentação de pendências
Branch: dev

## O que foi feito

- Revisão completa do estado do projeto
- Atualização de `.sdds/indexes/risks.index.md` com riscos atualizados (R-001 a R-006)
- Criação de timeline `2026-05-22.md` com pendências documentadas
- Nenhum código alterado — sessão de documentação

## Riscos atualizados

| ID | Alteração |
|---|---|
| R-001 | Renomeado de "Z-API não integrado" para "WA Integrations não implementada" — mais preciso |
| R-002 | Mantido — Webhooks sem HMAC |
| R-003 | Mantido — Vault não configurado |
| R-004 | Mantido — Kanban sem testes |
| R-005 | Substituído "Chat/Inbox: 0 linhas" (obsoleto) por "Analytics incompleto" |
| R-006 | Mantido — wa_* sem RLS (externo) |

## Próxima sessão

Implementar WA Integrations:
1. Spec SDDS
2. Tela `/settings/integrations`
3. Link `workspace_integrations → wa_tenant_id`
