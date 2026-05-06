# Chat/Inbox — Contract

Módulo: chat  
Data: 2026-05-13  
Status: DRAFT

---

## 1. Entradas

### `getConversationsAction(filters?)`
```typescript
interface ConversationFilters {
  status?: ConvStatus | "all"  // default: "all" (excluindo archived)
  page?: number                // default: 0
}
```

### `getMessagesAction(conversationId)`
```typescript
{ conversation_id: string }  // UUID — validado no workspace
```

### `getWorkspaceMembersForAssignAction()`
```typescript
// Sem parâmetros — workspace do contexto autenticado
// Retorna: lista de membros ativos para o seletor de atribuição
```

### `updateConversationStatusAction(input)`
```typescript
interface UpdateStatusInput {
  conversation_id: string  // UUID
  status: ConvStatus       // "open" | "pending" | "resolved" | "archived"
}
```

### `assignConversationAction(input)`
```typescript
interface AssignConversationInput {
  conversation_id: string
  assigned_to: string | null  // UUID de membro ativo ou null (desatribuir)
}
```

### `markAsReadAction(conversationId)`
```typescript
{ conversation_id: string }  // fire-and-forget, erros ignorados
```

---

## 2. Saídas

### `getConversationsAction()`
```typescript
type ConversationsResult =
  | { conversations: ConversationWithContact[]; total: number }
  | { error: string }

type ConversationWithContact = Conversation & {
  contact: { id: string; name: string; phone: string | null; avatar_url: string | null } | null
  assignee: { id: string; name: string | null; avatar_url: string | null } | null
}
```

### `getMessagesAction()`
```typescript
type MessagesResult =
  | { messages: MessageWithSender[] }
  | { error: string }

type MessageWithSender = Message & {
  sender: { id: string; name: string | null; avatar_url: string | null } | null
}
```

### `getWorkspaceMembersForAssignAction()`
```typescript
type MembersResult =
  | { members: { id: string; name: string | null; avatar_url: string | null }[] }
  | { error: string }
```

### Mutações (`updateStatus`, `assign`, `markAsRead`)
```typescript
type MutationResult =
  | { success: true }
  | { error: string }
```

---

## 3. Repository — IConversationRepository

```typescript
interface IConversationRepository {
  findAll(workspaceId: string, filters: ConversationFilters, page: number): Promise<{ data: ConversationWithContact[]; total: number }>
  findById(workspaceId: string, conversationId: string): Promise<ConversationWithContact | null>
  getMessages(workspaceId: string, conversationId: string): Promise<MessageWithSender[]>
  updateStatus(workspaceId: string, conversationId: string, status: ConvStatus): Promise<void>
  assign(workspaceId: string, conversationId: string, assignedTo: string | null): Promise<void>
  markAsRead(workspaceId: string, conversationId: string): Promise<void>
  validateOwnership(workspaceId: string, conversationId: string): Promise<boolean>
  validateMember(workspaceId: string, userId: string): Promise<boolean>
  getWorkspaceMembers(workspaceId: string): Promise<{ id: string; name: string | null; avatar_url: string | null }[]>
}
```

---

## 4. Validações (Zod)

### `updateConversationStatusSchema`
```typescript
z.object({
  conversation_id: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "archived"]),
})
```

### `assignConversationSchema`
```typescript
z.object({
  conversation_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable(),
})
```

---

## 5. Permissões

| Action | Permissão |
|---|---|
| `getConversationsAction` | `chat:view` |
| `getMessagesAction` | `chat:view` |
| `getWorkspaceMembersForAssignAction` | `chat:view` |
| `updateConversationStatusAction` | `chat:edit` |
| `assignConversationAction` | `chat:edit` |
| `markAsReadAction` | `chat:view` (fire & forget) |

---

## 6. Erros esperados

| Código | Mensagem | Causa |
|---|---|---|
| AUTH_ERROR | "Não autenticado." | Sem sessão |
| PERMISSION_ERROR | "Você não tem permissão para realizar esta ação." | RBAC negado |
| CONV_NOT_FOUND | "Conversa não encontrada." | IDOR ou conversa inexistente |
| MEMBER_INVALID | "Membro inválido para este workspace." | assigned_to inválido |

---

## 7. Realtime — Subscription

```typescript
// Canal único por workspace
const channel = supabase
  .channel(`workspace:${workspaceId}:chat`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'conversations',
    filter: `workspace_id=eq.${workspaceId}`,
  }, handler)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `workspace_id=eq.${workspaceId}`,
  }, handler)
  .subscribe()
```

Canal: `workspace:{workspaceId}:chat` — um canal por workspace (CC-01 INFERIDO)

---

## 8. Pontos A_CONFIRMAR

| CC | Ponto | Impacto no contrato |
|---|---|---|
| CC-01 | Canal Realtime: workspace único vs por conversa | Subscription já definida como workspace único (INFERIDO) |
| CC-02 | Criar conversa manual | Adicionar `createConversationAction` se confirmado |
| CC-03 | unread_count: decrementar via `markAsRead`? | `markAsRead` atualmente só zera — confirmar se deve decrementar progressivamente |
| CC-04 | Mobile navigation | Não impacta o contract |
