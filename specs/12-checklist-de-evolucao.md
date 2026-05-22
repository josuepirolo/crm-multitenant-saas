# 12 — Checklist de Evolução

Use este checklist antes de considerar qualquer feature ou mudança pronta para produção.

---

## Back-end (Server Actions / Route Handlers / UseCases)

- [ ] Server Action começa com `"use server"`
- [ ] Input validado com Zod no servidor (não confiar no cliente)
- [ ] `workspace_id` obtido de `getWorkspaceContext()` — nunca do body/params
- [ ] Erro retorna `{ error: string }` genérico — sem stack trace para o cliente
- [ ] Ação crítica gera entrada em `audit_logs`
- [ ] `createAdminClient()` NÃO usado em fluxo de usuário comum
- [ ] Rate limit aplicado se for endpoint público ou sensível
- [ ] Webhook (se novo) valida assinatura HMAC-SHA256

---

## Banco de dados

- [ ] Nova tabela tem `workspace_id` (exceto catálogos globais)
- [ ] RLS habilitado na nova tabela
- [ ] Policies SELECT filtram por `workspace_id`
- [ ] Policies INSERT forçam `workspace_id` do contexto
- [ ] Policies UPDATE e DELETE validam ownership
- [ ] Migration gerada com `npm run db:migration`
- [ ] Migration testada localmente antes de aplicar em produção
- [ ] Indexes necessários adicionados (colunas de filtro frequente)

---

## Segurança

- [ ] Nenhuma chave privada (`service_role`, `TURNSTILE_SECRET`) exposta como `NEXT_PUBLIC_`
- [ ] Nenhum token/senha em `metadata` do audit log
- [ ] `localStorage` não usado para sessão ou token
- [ ] Upload de arquivo valida MIME type + magic bytes + tamanho
- [ ] CSP não quebrada por novo asset externo
- [ ] RLS testada para o novo recurso (isolamento cross-tenant)

---

## Front-end

- [ ] Nenhuma cor Tailwind literal (`bg-white`, `text-gray-900`) — usar tokens CSS
- [ ] Skeleton loading implementado para nova listagem/tabela
- [ ] Todos os estados implementados: default, loading, empty, error
- [ ] Toast de feedback para ações assíncronas (`toast.promise()`)
- [ ] Dark mode testado e funcional
- [ ] Layout responsivo testado (mobile 375px + desktop 1280px)
- [ ] Formulário com label visível (nunca só placeholder)
- [ ] Validação inline com mensagem específica de erro

---

## Arquitetura

- [ ] Componente não chama Supabase diretamente
- [ ] Lógica de negócio no UseCase, não na action nem no componente
- [ ] ViewModel não acessa repository diretamente
- [ ] Novo UseCase testado de forma isolada
- [ ] Novo Repository filtrado por `workspace_id`
- [ ] Importações não cruzam camadas proibidas (UI → Repository direto, etc.)

---

## Testes

- [ ] Testes de isolamento de tenant adicionados para nova tabela
- [ ] Testes de segurança atualizados se novo endpoint/action criado
- [ ] `npm test` passa sem falhas
- [ ] `npm run typecheck` passa sem erros

---

## UX / UI

- [ ] Hierarquia visual clara — usuário sabe onde olhar primeiro
- [ ] Feedback imediato (< 100ms) para qualquer interação
- [ ] Transições suaves (Framer Motion onde aplicável)
- [ ] Tabelas com scroll horizontal no mobile
- [ ] Estado vazio tem mensagem e ação sugerida
- [ ] Tooltips para textos truncados

---

## Deploy / Integrações

- [ ] Variáveis de ambiente adicionadas no painel do ambiente de destino
- [ ] Migration aplicada via `supabase db push` (não manualmente)
- [ ] Nenhum `.env` commitado
- [ ] `npm run build` sem erros
- [ ] Funcionalidade testada em staging antes de produção

---

## Documentação

- [ ] `PROJECT.md` atualizado se nova tela ou decisão arquitetural
- [ ] `specs/` atualizado se novo módulo ou mudança de arquitetura
- [ ] ADR criado em `.sdds/decisions/` se decisão técnica relevante
- [ ] `/sdds-update` executado ao final da sessão
