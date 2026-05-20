# CHANGELOG.md

## 2026-05-20 — Setup GitHub + Arquitetura WA + Limpeza de banco

- Repositório GitHub configurado: `josuepirolo/crm-multitenant-saas` (privado, branches dev/prod)
- `_sdds_private/` e `.claude/settings.local.json` purgados do histórico git
- Script `scripts/create-tenant.mjs`: onboarding manual de tenant via CLI
- `conversations`, `messages`, `crm_contact_tags` dropadas do banco
- Descoberta: backend WA já provisionou 27 tabelas `wa_*` no mesmo Supabase
- `workspace_integrations` documentada (migration local criada)
- PROJECT.md: mapa completo das 44 tabelas + decisões arquiteturais
- ADR-001: arquitetura de integração WhatsApp registrada


## 2026-05-13 — Bootstrap SDDS v1.3.1

- Migração para framework privado `_sdds_private/` (v1.3.1)
- Recuperação de estado: .sdds/ não persistiu de sessão anterior
- Estado capturado do código real no disco
- Kanban: IMPLEMENTADO (código confirmado em src/)
- Chat: PLACEHOLDER — bloqueado por Z-API

## 2026-05-11 — Implementação Kanban (sessão anterior)

- @dnd-kit/core + @dnd-kit/sortable instalados
- deal.repository.ts, KanbanUseCases.ts, actions.ts criados
- Board DnD otimista com rollback implementado
- TypeScript: 0 erros
