# CHANGELOG.md

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
