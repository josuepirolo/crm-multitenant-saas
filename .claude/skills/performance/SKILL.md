---
name: performance
description: Análise de performance e UX do CRM Vendas WhatsApp. OBRIGATÓRIO em toda implementação ou alteração de código — seja um componente, Server Action, query, migration ou qualquer mudança mínima. Sempre ative junto com a skill de arquitetura: arquitetura define a estrutura, performance garante que nenhuma operação bloqueie o usuário. Ative também quando mencionar "lento", "travando", "fila", "background", "otimista", "UX" ou quando houver risco de o usuário esperar por uma operação assíncrona.
---

# Skill: Performance e UX — CRM Vendas WhatsApp

O princípio central é simples: **o usuário nunca deve esperar por algo que pode acontecer em background**. Toda ação deve ter feedback imediato, mesmo que o resultado real ainda esteja processando.

Esta skill é ativada em toda implementação ou alteração — não existe mudança pequena demais para ser avaliada.

## Fluxo de análise obrigatório

Para qualquer implementação, responda estas perguntas antes de escrever o código:

1. **Essa operação pode bloquear a UI?** (rede, banco, processamento pesado)
2. **O usuário precisa do resultado imediato, ou só de saber que a ação foi registrada?**
3. **O que acontece se der erro?** O usuário consegue recuperar?
4. **Existe feedback visual em cada estado?** (loading, sucesso, erro, vazio)
5. **Essa operação deveria ser otimista, em background, ou síncrona?**

---

## Classificação de operações

### Operações síncronas (usuário espera o resultado)
Use quando o resultado é necessário para continuar o fluxo:
- Login / autenticação
- Validação de formulário
- Busca com resultado imediato

**Padrão:** `toast.promise()` + skeleton loading enquanto aguarda.

### Operações otimistas (UI atualiza antes do servidor responder)
Use para ações CRUD simples onde a chance de erro é baixa:
- Criar/editar/deletar contato, deal, mensagem
- Mudar status de um card no kanban
- Marcar conversa como lida

**Padrão:** Atualizar o estado local imediatamente → enviar ao servidor → reverter em caso de erro.

```ts
// Exemplo com useOptimistic (Next.js 15)
const [optimisticContacts, addOptimistic] = useOptimistic(contacts);

async function handleDelete(id: string) {
  addOptimistic(contacts.filter(c => c.id !== id)); // UI atualiza já
  const result = await deleteContact(id);
  if (result.error) {
    toast.error(result.error); // reverte automaticamente
  }
}
```

### Operações em background (usuário não espera)
Use para processamento pesado onde o resultado não é imediato:
- Importar CSV com centenas de contatos
- Gerar relatório PDF/CSV
- Enviar e-mails em massa
- Processar webhooks do WhatsApp
- Sincronizar integrações

**Padrão:** Registrar a intenção → retornar feedback imediato → processar em background → notificar quando concluído (toast, badge, realtime).

---

## Padrões obrigatórios por contexto

### Server Actions com feedback
Toda Server Action que o usuário dispara deve usar `toast.promise()`:

```ts
// No componente
toast.promise(
  createContact(formData),
  {
    loading: "Criando contato...",
    success: "Contato criado!",
    error: (err) => err.message ?? "Erro ao criar contato.",
  }
);
```

### useTransition para atualizações não urgentes
Filtragens, ordenações e paginações não devem bloquear a interação:

```ts
const [isPending, startTransition] = useTransition();

function handleFilterChange(next: Partial<Filters>) {
  startTransition(() => setFilters(prev => ({ ...prev, ...next })));
}
```

### Debounce em campos de busca
Nunca disparar requisição a cada keystroke:

```ts
const debouncedSearch = useDebouncedCallback(
  (value: string) => updateFilters({ search: value }),
  300
);
```

### Suspense boundaries para streaming
Isolar partes pesadas da página para não bloquear o restante:

```tsx
// Dados pesados em streaming — o resto da página carrega primeiro
<Suspense fallback={<MetricsSkeleton />}>
  <DashboardMetrics />
</Suspense>
```

---

## Checklist de performance — aplicar em toda alteração

### UI e feedback
- [ ] Toda ação assíncrona usa `toast.promise()` ou feedback visual equivalente?
- [ ] Existe skeleton loading para cada estado de carregamento?
- [ ] Campos de busca têm debounce (mínimo 300ms)?
- [ ] Filtros e paginação usam `useTransition` para não bloquear?
- [ ] Estados vazios têm mensagem + ação sugerida?
- [ ] O botão de submit fica desabilitado durante o envio?

### Operações e dados
- [ ] Operações CRUD simples poderiam ser otimistas?
- [ ] Queries buscam apenas os campos necessários (evitar `select *` desnecessário)?
- [ ] Listas grandes têm paginação ou virtualização?
- [ ] Operações pesadas (importação, relatório) são processadas em background?
- [ ] Realtime (Supabase) é usado onde o usuário precisa ver atualizações ao vivo?

### Erros e resiliência
- [ ] Erros de rede são tratados com mensagem clara e ação de retry?
- [ ] Operações otimistas revertam corretamente em caso de falha?
- [ ] Timeout configurado para operações longas?

---

## Quando recomendar fila / background job

Recomende processamento em background quando qualquer condição for verdadeira:
- A operação processa mais de ~50 registros
- Envolve chamada a API externa (WhatsApp, SMTP, etc.)
- Gera arquivo (PDF, CSV, XLSX)
- Pode demorar mais de 2 segundos
- O usuário não precisa do resultado para continuar navegando

**Stack disponível no projeto:**
- **Supabase Edge Functions** — para jobs disparados por evento (webhook, trigger)
- **pg_cron** (Supabase) — para jobs agendados (relatórios diários, limpeza)
- **Supabase Realtime** — para notificar o usuário quando o job terminar

**Padrão de background job:**
```
1. Usuário dispara ação → Server Action registra job na tabela `jobs` → retorna imediato
2. Edge Function processa o job em background
3. Supabase Realtime notifica o cliente → toast de conclusão
```

---

## Métricas de referência (Next.js + Supabase)

| Operação | Meta aceitável | Meta ideal |
|---|---|---|
| CRUD simples (1 registro) | < 500ms | < 200ms |
| Listagem paginada (20 itens) | < 800ms | < 300ms |
| Busca com filtros | < 600ms | < 300ms |
| Dashboard com múltiplas queries | < 1.5s | < 800ms |
| Upload de arquivo | feedback < 100ms | — |

Se uma operação ultrapassar consistentemente a "meta aceitável", investigar:
1. Índices faltando no banco (verificar queries com `explain analyze`)
2. N+1 queries (usar joins ou `select` com relacionamentos)
3. Dados sendo buscados no cliente quando deveriam vir do servidor
4. Falta de cache (`revalidatePath` desnecessário a cada mutation)
