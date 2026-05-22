# 06 — Fluxos Principais

## Fluxo 1 — Cadastro de nova empresa

**Entrada:** `/register` — nome, email, senha, nicho, Turnstile

**Processamento:**
1. Validação Zod no cliente (UX)
2. Server Action `(auth)/actions.ts`
3. Validação Zod no servidor
4. Verificação Turnstile no servidor
5. Rate limit por IP
6. `supabase.auth.signUp()` — cria usuário em `auth.users`
7. Trigger no banco cria `profiles` e `workspaces` automaticamente
8. Audit log: `REGISTER_SUCCESS`
9. Redirect para `/login`

**Arquivos:** `src/app/(auth)/register/page.tsx`, `src/app/(auth)/actions.ts`

**Pendências:** email de confirmação pode não estar configurado no Supabase

---

## Fluxo 2 — Login

**Entrada:** `/login` — email, senha, Turnstile

**Processamento:**
1. Validação Zod + Turnstile no cliente (UX)
2. Server Action `(auth)/actions.ts`
3. Validação Zod no servidor
4. Verificação Turnstile no servidor
5. Rate limit por IP e por email
6. `supabase.auth.signInWithPassword()`
7. Audit log: `LOGIN_SUCCESS` ou `LOGIN_FAILURE`
8. Se MFA ativo → redirect `/mfa`
9. Se sem nicho configurado → redirect `/setup-niche`
10. Senão → redirect `/dashboard`

**Arquivos:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/actions.ts`

---

## Fluxo 3 — Verificação MFA

**Entrada:** `/mfa` — código TOTP de 6 dígitos

**Processamento:**
1. Server Action `(auth)/mfa/actions.ts`
2. `supabase.auth.mfa.challengeAndVerify()`
3. Audit log: `MFA_VERIFIED` ou `MFA_FAILED`
4. Sucesso → redirect `/dashboard`

**Arquivos:** `src/app/(auth)/mfa/page.tsx`, `src/app/(auth)/mfa/actions.ts`

---

## Fluxo 4 — Acesso ao dashboard (guard)

**Entrada:** qualquer rota `/(dashboard)/*`

**Processamento:**
1. Middleware Next.js verifica cookie de sessão
2. Se sem sessão → redirect `/login`
3. Se MFA pendente → redirect `/mfa`
4. `layout.tsx` do dashboard chama `getWorkspaceContext()`
5. Se sem workspace → redirect `/no-workspace`
6. Se sem nicho → renderiza "Niche Setup Wall"
7. Senão → renderiza layout com sidebar + conteúdo

**Arquivos:** `src/middleware.ts`, `src/app/(dashboard)/layout.tsx`, `src/lib/guards.ts`

---

## Fluxo 5 — CRUD de Contatos

**Entrada:** `/contacts` — lista, filtros, criação, edição, exclusão

**Processamento (criação):**
1. Client Component `contacts-client.tsx` chama ViewModel
2. `useContactsViewModel` chama `ContactUseCases.createContact()`
3. UseCase valida e chama `contact.repository.ts`
4. Repository faz INSERT no Supabase (workspace_id do contexto)
5. RLS garante isolamento
6. Toast de sucesso via Sonner
7. Audit log: `CONTACT_CREATED`

**Fluxo de leitura:**
1. `page.tsx` (Server Component) chama UseCase diretamente
2. UseCase chama Repository com server client + RLS

**Arquivos:** `src/app/(dashboard)/contacts/`, `src/viewmodels/useContactsViewModel.ts`, `src/usecases/ContactUseCases.ts`, `src/repositories/contact.repository.ts`

---

## Fluxo 6 — Kanban (Drag & Drop)

**Entrada:** `/kanban` — board de deals com DnD

**Processamento (mover card):**
1. `kanban-client.tsx` captura evento `onDragEnd` do @dnd-kit
2. `useKanbanViewModel` executa update **otimista** (UI atualiza imediatamente)
3. Server Action `kanban/actions.ts` chamada em background
4. UseCase valida e chama `deal.repository.ts`
5. Se erro → ViewModel faz rollback do estado local
6. Toast de erro se necessário

**Arquivos:** `src/app/(dashboard)/kanban/`, `src/viewmodels/useKanbanViewModel.ts`, `src/usecases/KanbanUseCases.ts`, `src/repositories/deal.repository.ts`

---

## Fluxo 7 — Settings do Workspace

**Entrada:** `/settings` — abas: Empresa, Segmento, Perfil, 2FA, Membros, Permissões

**Processamento (salvar empresa):**
1. `settings-client.tsx` + `useSettingsViewModel`
2. Server Action `settings/actions.ts`
3. Validação Zod no servidor
4. `getWorkspaceContext()` — workspace_id do contexto, nunca do form
5. UseCase chama Repository
6. Audit log: `WORKSPACE_UPDATED`

**Fluxo de upload de logo:**
1. `upload-actions.ts` valida MIME, tamanho, magic bytes
2. Upload para Supabase Storage (bucket privado `workspace-logos`)
3. URL gravada em `workspaces.logo_url`

**Arquivos:** `src/app/(dashboard)/settings/`, `src/viewmodels/useSettingsViewModel.ts`

---

## Fluxo 8 — Impersonation (Superadmin)

**Entrada:** `/admin/workspaces` — botão "Acessar como"

**Processamento:**
1. `requireSuperAdmin()` valida que usuário é superadmin
2. `impersonation-actions.ts` grava workspace_id alvo em cookie seguro
3. Redirect para `/dashboard` do workspace impersonado
4. `getWorkspaceContext()` detecta cookie de impersonation
5. Audit log: `IMPERSONATION_START`
6. Banner de impersonation exibido na UI
7. "Sair da impersonation" limpa cookie + audit log `IMPERSONATION_END`

**Arquivos:** `src/lib/impersonation.ts`, `src/app/(admin)/admin/impersonation-actions.ts`

---

## Fluxo 9 — API de CEP (proxy interno)

**Entrada:** `GET /api/address/cep?cep=01310100`

**Processamento:**
1. Route Handler valida formato do CEP
2. Rate limit por IP
3. Fetch para ViaCEP (no servidor — não expõe ViaCEP ao browser)
4. Retorna dados normalizados

**Arquivos:** `src/app/api/address/cep/route.ts`

---

## Fluxo 10 — Chat / Inbox

**Estado atual:** PLACEHOLDER. A rota `/chat` existe mas a página é vazia.

**Planejado:**
1. Buscar `workspace_integrations` do workspace ativo
2. Usar `wa_tenant_id` para listar conversas de `wa_conversations`
3. Exibir mensagens de `wa_messages`
4. Envio de mensagem via backend WA (não implementado)

**Bloqueante:** módulo WA Integrations precisa ser implementado primeiro.
