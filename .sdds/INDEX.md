# INDEX.md

SDDS_VERSION: 1.3.2
Atualizado: 2026-05-20

## Ler primeiro
1. `CURRENT_STATE.md` — estado atual
2. `MEMORY.md` — contexto técnico

## Specs existentes
| Módulo | Summary | Spec | Contract | Harness |
|---|---|---|---|---|
| chat | `specs/chat.summary.md` | `specs/chat.spec.md` | `contracts/chat.contract.md` | `harness/chat.harness.md` |

> ⚠️ Spec de Chat é obsoleta — conversations/messages foram removidas. WA Integrations precisa de nova spec.

## Decisões (ADRs)
| ADR | Decisão |
|---|---|
| `decisions/ADR-001-whatsapp-architecture.md` | Frontend agnóstico ao provider WA; WA API é fonte de verdade |

## Discoveries
| Discovery | Resumo |
|---|---|
| `discoveries/2026-05-20-wa-backend-architecture.md` | Backend WA tem 27 tabelas wa_* no mesmo Supabase; ponte via workspace_integrations |

## Sessões recentes
| Data | Evento |
|---|---|
| 2026-05-20 | Setup GitHub, limpeza banco, arquitetura WA, PROJECT.md |
| 2026-05-13 | Bootstrap SDDS v1.3.1 — recuperação de estado |
| 2026-05-13 | Spec Chat/Inbox criada (02_CREATE_MODULE_SPEC) |

## Indexes
- `indexes/modules.index.md`
- `indexes/risks.index.md`
