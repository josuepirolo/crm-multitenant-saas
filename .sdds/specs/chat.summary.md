# Chat/Inbox — Summary

Módulo: chat  
Risco: MÉDIO (UI shell) / ALTO (integração Z-API futura)  
Status: SPEC  
Data: 2026-05-13

## Objetivo

Inbox de conversas WhatsApp com painel duplo (lista de conversas + thread de mensagens). V1 implementa a UI completa como shell funcional usando dados reais do banco. Envio/recebimento real de mensagens aguarda Z-API (v2).

## Regras críticas

1. `workspace_id` sempre do contexto autenticado
2. Conversations filtrам por `workspace_id` + `deleted_at IS NULL`
3. `unread_count` existe no banco — decrementar ao visualizar conversa (marcação local)
4. Status de conversa gerenciado pelos membros — nunca pelo WhatsApp diretamente no v1
5. Permissão `chat:view` para acessar; `chat:edit` para mudar status/atribuição; `chat:create` para criar conversa manual
6. Layout: painel duplo no desktop (lista ~360px + thread flex-1); tela única no mobile (nav entre lista e thread)
7. Realtime: Supabase Realtime subscribe no canal de conversas do workspace
8. Envio de mensagem real: FORA DO ESCOPO v1 (Z-API pendente)

## Arquivos relacionados

### Existentes (banco + domínio)
- `src/types/index.ts` — Conversation, Message, ConvStatus, MessageDirection, MessageStatus
- `src/lib/permissions.ts` — módulo `chat`, roles
- `supabase/migrations/20260417030430_initial_schema.sql` — conversations, messages
- `supabase/migrations/20260418000000_roles_and_soft_delete.sql` — deleted_at, conv_status policies

### A criar
- `src/repositories/conversation.repository.ts`
- `src/usecases/ChatUseCases.ts`
- `src/app/(dashboard)/chat/actions.ts`
- `src/viewmodels/useChatViewModel.ts`
- `src/components/chat/ConversationList.tsx`
- `src/components/chat/ConversationItem.tsx`
- `src/components/chat/ChatThread.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ChatHeader.tsx`
- `src/components/chat/ChatSkeleton.tsx`
- `src/components/chat/ChatEmptyState.tsx`
- `src/app/(dashboard)/chat/chat-client.tsx`

## Riscos

| Risco | Nível |
|---|---|
| Z-API não integrado — sem mensagens reais | ALTO — aceito no v1 (shell) |
| Realtime: canal correto do workspace A_CONFIRMAR | MÉDIO |
| unread_count: mecanismo de decremento sem Z-API | MÉDIO |
| Conversas vazias: sem dados reais em workspaces sem WhatsApp | MÉDIO |

## Pendências (A_CONFIRMAR)

| CC | Pergunta | Criticidade |
|---|---|---|
| CC-01 | Realtime: assinar canal workspace ou por conversa? | A_CONFIRMAR_RELEVANTE |
| CC-02 | V1 permite criar conversa manual (sem WhatsApp)? | A_CONFIRMAR_RELEVANTE |
| CC-03 | unread_count: decrementar ao abrir conversa? Quem atualiza? | A_CONFIRMAR_RELEVANTE |
| CC-04 | Mobile: nav tab (lista/thread) ou slide/push navigation? | A_CONFIRMAR_RESIDUAL |
