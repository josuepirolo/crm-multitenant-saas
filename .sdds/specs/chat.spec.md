# Chat/Inbox — Spec Completa

Módulo: chat  
Versão: 1.0  
Data: 2026-05-13  
Status: SPEC

---

## 1. Objetivo

Inbox de conversas WhatsApp integrado ao CRM. Painel duplo com lista de conversas (filtradas por status) e thread de mensagens. V1 é shell funcional: UI completa com dados reais, sem envio/recebimento via Z-API.

---

## 2. Escopo (v1)

- Listar conversas do workspace (ordenadas por `last_message_at DESC`)
- Filtrar por status: open, pending, resolved
- Badge de não lidas (`unread_count`)
- Abrir thread de mensagens de uma conversa
- Exibir mensagens em bubbles (inbound ← / outbound →)
- Mudar status da conversa (open → pending → resolved → archived)
- Atribuir conversa a membro do workspace
- Ver informações do contato vinculado
- Ver deal vinculado (link para Kanban)
- Realtime: atualizar lista ao receber nova conversa/mensagem via Supabase Realtime
- Layout responsivo: painel duplo desktop, tela única mobile

---

## 3. Fora de escopo (v1)

- Enviar mensagem real via WhatsApp (Z-API — v2)
- Receber mensagem real via webhook (Z-API — v2)
- Criar conversa a partir do número de WhatsApp (v2)
- Mensagens de mídia (imagens, áudio, vídeo, documentos) — v2
- Templates de WhatsApp — v2
- Busca de mensagens — v2
- Ações em massa sobre conversas — v2
- Chatbot / automações — v3

---

## 4. Comportamento atual observado

- `src/app/(dashboard)/chat/page.tsx`: 10 linhas, placeholder vazio
- Tabelas `conversations` e `messages`: existem com RLS ativo
- Nenhum repository, usecase, action ou componente de chat implementado
- Conversations referenciadas em `Dashboard` via `openConversations` count

---

## 5. Comportamento desejado

1. Usuário acessa `/chat`
2. Sistema carrega lista de conversas ativas do workspace
3. Painel esquerdo: lista de conversas com status, contato, preview da última mensagem, badge de não lidas
4. Painel direito: empty state "Selecione uma conversa" (desktop) ou oculto (mobile)
5. Usuário seleciona conversa → thread de mensagens carrega no painel direito
6. Thread exibe mensagens em ordem cronológica com bubbles diferenciados por direção
7. Header da thread: nome do contato, status da conversa, botões de ação (atribuir, mudar status)
8. Realtime: nova conversa ou mensagem → atualiza lista automaticamente

---

## 6. Regras de negócio

### Conversas
- Listagem filtra por `status ≠ archived` por padrão
- Ordenação: `last_message_at DESC` (mais recente no topo)
- Filtros disponíveis: "Abertas" (open), "Pendentes" (pending), "Resolvidas" (resolved)
- `unread_count`: exibido como badge; decrementado ao abrir a conversa (UPDATE no banco)
- Atribuição (`assigned_to`): qualquer membro ativo do workspace pode ser atribuído

### Status de conversa
- `open` → `pending`: conversa aguardando resposta do cliente
- `open`/`pending` → `resolved`: conversa encerrada com sucesso
- `resolved` → `open`: reabertura
- `archived`: conversa ocultada permanentemente (não deletada)
- Qualquer status → `archived`: apenas com permissão `chat:delete`

### Mensagens
- Exibidas em ordem cronológica (`created_at ASC`)
- `inbound`: mensagem recebida (bubble esquerda, bg muted)
- `outbound`: mensagem enviada (bubble direita, bg primary/accent)
- Status de mensagem (`sent`, `delivered`, `read`, `failed`): exibido como ícone discreto
- `failed`: mensagem com badge vermelho "Erro no envio"

### Sem Z-API (v1)
- Thread mostra mensagens existentes no banco
- CTA "Conectar WhatsApp" exibido quando workspace não tem integração Z-API
- Botão "Enviar mensagem" desabilitado com tooltip explicativo
- Usuário pode gerenciar status e atribuição mesmo sem Z-API

---

## 7. Regras técnicas

### Arquitetura
- Clean Architecture + MVVM — padrão do projeto
- `useChatViewModel`: estado da lista + conversa ativa + realtime subscription
- Server Actions para mutações (mudar status, atribuir)
- Dados iniciais carregados client-side (pattern do projeto: `useEffect + server action`)

### Supabase
- Queries filtram `workspace_id` do contexto autenticado
- `conversations`: `deleted_at IS NULL`, `status != 'archived'` para listagem padrão
- `messages`: `conversation_id = selectedConversation.id` + `ORDER BY created_at ASC`
- Realtime: `supabase.channel('workspace:{workspaceId}').on('postgres_changes', ...)`

### Layout
- Desktop: `flex h-full` → `w-[360px] shrink-0 border-r` (lista) + `flex-1` (thread)
- Mobile: `flex-col` com state `view: 'list' | 'thread'`
- Thread em mobile: botão "←" volta para lista

### Performance
- Lista: paginação de 30 conversas, scroll infinito ou paginação simples
- Thread: carregar últimas 50 mensagens, scroll to bottom automático
- Realtime: subscription ao abrir chat, unsubscribe ao fechar
- `useTransition` para filtros de status

---

## 8. Entradas

### `getConversationsAction(filters)`
```typescript
{ status?: ConvStatus | "all"; page?: number }
```

### `getMessagesAction(conversationId)`
```typescript
{ conversation_id: string }
```

### `updateConversationStatusAction(input)`
```typescript
{ conversation_id: string; status: ConvStatus }
```

### `assignConversationAction(input)`
```typescript
{ conversation_id: string; assigned_to: string | null }
```

### `markAsReadAction(conversationId)`
```typescript
{ conversation_id: string }
// Sets unread_count = 0
```

---

## 9. Saídas

### `ConversationWithContact`
```typescript
Conversation & {
  contact: { id: string; name: string; phone: string | null; avatar_url: string | null } | null
  assignee: { id: string; name: string | null; avatar_url: string | null } | null
  last_message_preview?: string | null
}
```

### `MessageWithSender`
```typescript
Message & {
  sender: { id: string; name: string | null; avatar_url: string | null } | null
}
```

---

## 10. Estados possíveis

### Lista de conversas
- `loading` — skeleton
- `empty` — sem conversas no workspace / no filtro
- `loaded` — lista com conversas
- `error` — falha ao carregar

### Thread
- `idle` — nenhuma conversa selecionada (empty state)
- `loading` — carregando mensagens
- `empty` — conversa sem mensagens
- `loaded` — thread com mensagens
- `error` — falha ao carregar

### Conversa (item da lista)
- `open` — badge azul
- `pending` — badge amarelo
- `resolved` — badge verde
- `archived` — não aparece na lista padrão

---

## 11. Fluxos principais

### F1 — Carregar inbox
1. `useChatViewModel` monta → `getConversationsAction({ status: 'all' })`
2. Lista exibida com skeleton durante carregamento
3. Realtime subscription ativada no workspace channel
4. Conversa selecionada = null → empty state no painel direito

### F2 — Selecionar conversa
1. Usuário clica na conversa
2. `selectedConversationId` atualizado no ViewModel
3. `getMessagesAction(conversationId)` chamado
4. `markAsReadAction(conversationId)` chamado (fire & forget)
5. Thread renderizada com scroll to bottom automático
6. Mobile: view muda para 'thread'

### F3 — Mudar status
1. Usuário clica no botão de status no header da thread
2. `toast.promise(updateConversationStatusAction(...))`
3. Lista atualizada otimisticamente
4. Rollback se falhar

### F4 — Atribuir conversa
1. Usuário abre dropdown de membros no header
2. Seleciona membro (ou "Sem responsável")
3. `toast.promise(assignConversationAction(...))`
4. Header e lista atualizados

### F5 — Realtime update
1. Nova mensagem chega no banco (via webhook futuro ou teste manual)
2. Supabase Realtime dispara evento
3. `conversations` lista atualizada (preview + `last_message_at`)
4. Se conversa ativa = conversa atualizada → mensagem adicionada ao thread
5. Badge de não lidas atualizado na lista

---

## 12. Fluxos alternativos

### FA1 — Sem conversas
- Empty state: ícone de mensagem + "Nenhuma conversa ainda"
- CTA: "Conectar WhatsApp" (link para Settings → integração — v2)

### FA2 — Sem Z-API
- Banner fixo no topo da thread: "WhatsApp não conectado — conecte para enviar mensagens"
- Botão "Enviar" desabilitado
- Gerenciamento de status e atribuição funcionam normalmente

### FA3 — Mobile — seleção de conversa
- Usuário clica na conversa → `view = 'thread'`
- Botão "←" no header da thread → `view = 'list'`

---

## 13. Erros e exceções

| Erro | Causa | Tratamento |
|---|---|---|
| Sem permissão `chat:view` | RBAC negado | Redirecionar ou mensagem |
| Conversa não pertence ao workspace | IDOR | Action retorna erro genérico |
| Realtime desconectado | Rede | Reconectar automaticamente (Supabase SDK handle) |
| `markAsRead` falha | DB | Ignorar silenciosamente (não bloquear UX) |

---

## 14. Segurança e permissões

- `workspace_id` sempre do `getWorkspaceContext()` — nunca do cliente
- `conversation_id` validado como pertencente ao workspace antes de qualquer mutação
- `assigned_to` validado como membro ativo do workspace
- Realtime: channel namespaced por workspace (`workspace:{workspaceId}`)
- RLS protege queries diretas ao banco mesmo sem validação explícita

---

## 15. Integrações

- **Contacts**: `contact_id` → exibir nome e avatar na conversa
- **Kanban**: `deal_id` → link para a negociação associada
- **Z-API** (v2): envio/recebimento real de mensagens via webhooks
- **Dashboard**: `openConversations` count já existe no DashboardRepository

---

## 16. Persistência / dados

| Tabela | Operações |
|---|---|
| `conversations` | SELECT (lista + filtro), UPDATE (status, assigned_to, unread_count) |
| `messages` | SELECT (thread por conversa) |
| `contacts` | SELECT (join — nome, telefone, avatar) |
| `profiles` | SELECT (join — assignee, sender) |
| `workspace_members` | SELECT (lista de membros para atribuição) |

---

## 17. Observabilidade

- `console.error` em falhas de repositório (sem dados sensíveis)
- Realtime: logar conexão/desconexão em dev
- Audit: ações de status/atribuição NÃO auditadas no v1 (escopo mínimo)

---

## 18. Riscos

| Risco | Nível | Mitigação |
|---|---|---|
| Z-API ausente — UI vazia de conteúdo real | ALTO | Shell funcional + empty state claro + CTA conectar |
| Realtime overload com muitas conversas | MÉDIO | Subscription no workspace channel, não por conversa |
| unread_count inconsistente sem Z-API | MÉDIO | Aceito — será corrigido com webhook de leitura |
| Conversa de outro workspace (IDOR) | CRÍTICO | validateConversationOwnership em todas as actions |

---

## 19. Pendências A_CONFIRMAR

| CC | Pergunta | Status |
|---|---|---|
| CC-01 | Realtime: canal workspace único ou canais por conversa? | A_CONFIRMAR_RELEVANTE |
| CC-02 | V1 permite criar conversa manual (inserir phone manualmente)? | A_CONFIRMAR_RELEVANTE |
| CC-03 | unread_count: decrementar ao abrir conversa? UPDATE fire-and-forget? | A_CONFIRMAR_RELEVANTE |
| CC-04 | Mobile: tabs ou push navigation? | A_CONFIRMAR_RESIDUAL |

---

## 20. Critérios de aceite

- [ ] Lista de conversas exibe conversas do workspace ordenadas por `last_message_at DESC`
- [ ] Filtros por status (open, pending, resolved) funcionam
- [ ] Badge de não lidas exibido corretamente
- [ ] Selecionar conversa carrega thread de mensagens
- [ ] Bubbles diferenciados: inbound (esquerda) / outbound (direita)
- [ ] Scroll automático para mensagem mais recente
- [ ] Mudar status de conversa (open/pending/resolved/archived)
- [ ] Atribuir conversa a membro
- [ ] Realtime atualiza lista ao receber evento do banco
- [ ] Skeleton loading na lista e na thread
- [ ] Empty state claro quando sem conversas
- [ ] Banner "WhatsApp não conectado" quando sem Z-API
- [ ] Botão "Enviar" desabilitado sem Z-API
- [ ] Layout painel duplo no desktop
- [ ] Layout tela única (lista/thread) no mobile
- [ ] workspace_id nunca vem do cliente
- [ ] conversation_id validado como pertencente ao workspace
- [ ] Nenhuma cor Tailwind literal — apenas tokens CSS
- [ ] Dark mode funcional
