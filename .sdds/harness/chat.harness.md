# Chat/Inbox — Harness

Módulo: chat  
Data: 2026-05-13

---

## 1. Cenários obrigatórios (20)

| ID | Cenário | Tipo |
|---|---|---|
| CH-01 | Usuário com `chat:view` carrega lista de conversas | Happy path |
| CH-02 | Usuário sem `chat:view` é bloqueado | Segurança |
| CH-03 | Selecionar conversa carrega thread de mensagens | Happy path |
| CH-04 | Thread exibe inbound (esquerda) e outbound (direita) | Happy path |
| CH-05 | Scroll automático para mensagem mais recente | UI |
| CH-06 | Filtrar por status "open" | Happy path |
| CH-07 | Filtrar por status "pending" | Happy path |
| CH-08 | Filtrar por status "resolved" | Happy path |
| CH-09 | Badge de não lidas exibido corretamente | Happy path |
| CH-10 | `markAsRead` zera unread_count ao abrir conversa | Happy path |
| CH-11 | Mudar status de conversa (open → resolved) | Happy path |
| CH-12 | Atribuir conversa a membro | Happy path |
| CH-13 | Atribuição com membro de outro workspace bloqueada (IDOR) | Segurança |
| CH-14 | Conversa de outro workspace bloqueada (IDOR) | Segurança |
| CH-15 | Realtime: nova conversa atualiza lista | Realtime |
| CH-16 | Realtime: nova mensagem atualiza thread ativa | Realtime |
| CH-17 | Empty state quando workspace sem conversas | Alternativo |
| CH-18 | Banner "WhatsApp não conectado" sem Z-API | Alternativo |
| CH-19 | Layout painel duplo no desktop | UI |
| CH-20 | Layout tela única no mobile (nav lista/thread) | UI |

---

## 2. Casos felizes

### CH-01 — Carregar lista
```
DADO: usuário autenticado, role manager, workspace W
DADO: 5 conversas open, 2 pending, 1 resolved

QUANDO: usuário acessa /chat
ENTÃO: lista exibe 8 conversas (excluindo archived)
ENTÃO: ordenadas por last_message_at DESC
ENTÃO: skeleton exibido durante carregamento
```

### CH-03 — Selecionar conversa
```
DADO: conversa C1 com 10 mensagens

QUANDO: usuário clica em C1
ENTÃO: thread exibe 10 mensagens em ordem cronológica
QUANDO: carregamento completo
ENTÃO: scroll posicionado na última mensagem
```

### CH-11 — Mudar status
```
DADO: conversa C1 com status=open
DADO: usuário com chat:edit

QUANDO: usuário clica "Resolver" no header
ENTÃO: toast.promise disparado
ENTÃO: status atualiza para "resolved"
ENTÃO: conversa sai da lista "open" (se filtro ativo)
```

### CH-12 — Atribuir conversa
```
DADO: conversa C1 sem assignee
DADO: workspace tem membro M1 ativo

QUANDO: usuário seleciona M1 no dropdown de atribuição
ENTÃO: assignConversationAction({ conversation_id: C1, assigned_to: M1 })
ENTÃO: header da conversa atualiza com nome do M1
ENTÃO: toast de sucesso exibido
```

---

## 3. Casos de erro

### CH-18 — Sem Z-API
```
DADO: workspace sem integração Z-API configurada

QUANDO: usuário abre thread
ENTÃO: banner "WhatsApp não conectado — conecte para enviar mensagens"
ENTÃO: botão "Enviar" desabilitado com tooltip explicativo
ENTÃO: gerenciamento de status e atribuição funciona normalmente
```

### CH-17 — Sem conversas
```
DADO: workspace sem nenhuma conversa

QUANDO: usuário acessa /chat
ENTÃO: empty state: ícone + "Nenhuma conversa ainda"
ENTÃO: CTA "Conectar WhatsApp" visível
```

---

## 4. Casos de segurança

### CH-02 — Sem permissão
```
DADO: usuário com role customizado sem chat:view

QUANDO: getConversationsAction()
ENTÃO: getWorkspaceContext retorna { error: "Você não tem permissão..." }
ENTÃO: lista não carrega
```

### CH-13 — IDOR em atribuição
```
DADO: membro M99 pertence ao workspace W2 (não ao W1 do usuário)

QUANDO: assignConversationAction({ conversation_id: C1, assigned_to: M99 })
ENTÃO: validateMember retorna false
ENTÃO: action retorna { error: "Membro inválido para este workspace." }
ENTÃO: atribuição não ocorre
```

### CH-14 — IDOR em conversa
```
DADO: conversa C99 pertence ao workspace W2

QUANDO: getMessagesAction({ conversation_id: C99 })
ENTÃO: validateOwnership retorna false
ENTÃO: action retorna { error: "Conversa não encontrada." }
ENTÃO: RLS bloqueia mesmo se validação falhar
```

---

## 5. Casos de realtime

### CH-15 — Nova conversa via Realtime
```
DADO: usuário na tela /chat, subscription ativa
DADO: nova conversa inserida no banco (workspace W)

QUANDO: evento INSERT em conversations chega via Supabase Realtime
ENTÃO: lista de conversas atualiza automaticamente
ENTÃO: nova conversa aparece no topo (last_message_at mais recente)
ENTÃO: badge de não lidas exibido
```

### CH-16 — Nova mensagem via Realtime
```
DADO: conversa C1 está aberta no painel
DADO: nova mensagem inserida para C1

QUANDO: evento INSERT em messages chega
ENTÃO: mensagem aparece no thread automaticamente
ENTÃO: scroll move para a nova mensagem
ENTÃO: unread_count da conversa atualiza na lista
```

---

## 6. Casos de regressão

### CH-R01 — Dashboard não quebra
```
DADO: módulo Chat implementado

QUANDO: usuário acessa /dashboard
ENTÃO: openConversations count continua correto
ENTÃO: DashboardRepository não afetado
```

### CH-R02 — Kanban: deal_id link funciona
```
DADO: conversa C1 com deal_id = D1

QUANDO: usuário vê header da conversa
ENTÃO: link para Deal D1 visível
ENTÃO: clicar navega para /kanban (ou abre modal do deal)
```

---

## 7. Dados mínimos de teste

```sql
-- Conversa sem contato (número direto)
INSERT INTO conversations (workspace_id, phone, status)
VALUES ('{workspace_id}', '5511999999999', 'open');

-- Conversa com contato
INSERT INTO conversations (workspace_id, contact_id, phone, status, unread_count)
VALUES ('{workspace_id}', '{contact_id}', '5511888888888', 'pending', 3);

-- Mensagens para a primeira conversa
INSERT INTO messages (workspace_id, conversation_id, direction, content, status)
VALUES
  ('{workspace_id}', '{conv_id}', 'inbound', 'Olá, preciso de ajuda', 'read'),
  ('{workspace_id}', '{conv_id}', 'outbound', 'Olá! Como posso ajudar?', 'delivered'),
  ('{workspace_id}', '{conv_id}', 'inbound', 'Quero saber sobre o produto X', 'read');
```

---

## 8. Critérios de aprovação

- [ ] Todos os 20 cenários cobertos
- [ ] IDOR bloqueado em CH-13 e CH-14
- [ ] Realtime funcional em CH-15 e CH-16
- [ ] Regressão do Dashboard (CH-R01) validada
- [ ] workspace_id nunca aceito do cliente
- [ ] Testes de segurança em `src/tests/tenant-isolation/conversation.repository.test.ts`
