# MEMORY.md

SDDS_VERSION: 1.3.1  
Atualizado: 2026-05-13

## Stack

Next.js 16.2.4 + React 19 + TypeScript 5 + Supabase (PostgreSQL + RLS + Auth + Storage) + Tailwind CSS 4 + shadcn/ui (@base-ui/react) + Framer Motion + React Hook Form + Zod 4 + Vitest 4

## Arquitetura

Clean Architecture + MVVM: View → ViewModel → UseCase → Repository → Supabase  
Server Actions com `"use server"` + `getWorkspaceContext(module, action)` para RBAC

## Segurança

- RLS em todas as tabelas — my_workspace_ids() SECURITY DEFINER
- getWorkspaceContext() — ponto central de autorização (nunca workspace_id do cliente)
- createAdminClient() — apenas audit_logs, rate_limits, admin actions
- Rate limit via tabela Supabase (não memória local)
- Audit logs: 20+ ações com session_id + fingerprint SHA-256
- Cloudflare Turnstile nas ações públicas

## Kanban — implementado em 2026-05-11

- `src/lib/validations/deal.ts` — schemas Zod (create, update, move, close)
- `src/repositories/deal.repository.ts` — IDealRepository + SupabaseDealRepository
- `src/usecases/KanbanUseCases.ts` — 7 use cases (Get, Create, Update, Move, Close, Archive, DefaultPipeline)
- `src/app/(dashboard)/kanban/actions.ts` — 8 server actions com RBAC
- `src/viewmodels/useKanbanViewModel.ts` — DnD otimista, rollback, dialog state
- `src/components/kanban/` — Board, Column, DealCard, DealDialog, Skeleton, EmptyState
- @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities instalados
- Mobile: scroll horizontal, min-width 280px por coluna
- Empty state: CTA admin cria pipeline default ("Funil Principal" + 3 stages)
- Proteção IDOR: validateStageOwnership + validateContactOwnership

## Chat/Inbox — pendente

- Tabelas: conversations, messages — existem no banco com RLS
- UI: página placeholder (8 linhas)
- Bloqueio: Z-API não integrado — sem credenciais, sem webhooks
- Schema de conversations/messages pronto para uso
- `ConvStatus = "open" | "pending" | "resolved" | "archived"`
- `MessageDirection = "inbound" | "outbound"`
- `MessageStatus = "sent" | "delivered" | "read" | "failed"`

## Componentes UI disponíveis

`src/components/ui/`: button, input, label, card, badge, table, select (@base-ui/react), skeleton, modal-overlay, motion (appleEase, fadeUp, FadeUp, FadeIn)

Modal pattern: AnimatePresence + ModalOverlay + motion.div (sem Dialog component)

## Pendências críticas do projeto

1. Z-API integration (WhatsApp real) — ALTO
2. Webhooks HMAC validation — ALTO
3. Chat/Inbox UI completa — MÉDIO (pode ser feita sem Z-API como shell)
4. Kanban testes automatizados — MÉDIO
