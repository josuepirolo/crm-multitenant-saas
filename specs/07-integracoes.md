# 07 — Integrações

## Supabase

**Finalidade:** banco de dados (PostgreSQL), autenticação, storage e realtime.

**Onde está implementada:**
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client (SSR)
- `src/lib/supabase/admin.ts` — client com service_role
- `src/lib/supabase/middleware.ts` — renovação de sessão

**Como configurar:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://[projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
```

**Módulos do Supabase em uso:**
- Auth (email/senha + TOTP MFA)
- PostgreSQL + RLS
- Storage (bucket `workspace-logos`, bucket `avatars`) — privados com RLS
- CLI para migrations

**Riscos:**
- `service_role` exposto acidentalmente → revisar todas as variáveis de ambiente
- Vault não configurado — tokens de integração WA sem criptografia

---

## Cloudflare Turnstile (anti-bot)

**Finalidade:** proteção de forms públicos contra bots e scripts automatizados.

**Onde está implementada:**
- `src/lib/security/turnstile.ts` — validação server-side
- Componente `@marsidev/react-turnstile` nas páginas de auth

**Como configurar:**
```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=[site_key]  ← aparece no HTML do browser
TURNSTILE_SECRET_KEY=[secret_key]           ← apenas no servidor
```

**Aplicado em:** login, registro, reset de senha

**Riscos:** se a secret key vazar, Turnstile pode ser bypassado.

---

## WhatsApp API (backend externo)

**Finalidade:** fonte de verdade para conversas, mensagens e instâncias WhatsApp.

**Estado:** banco compartilhado provisionado; integração no frontend **pendente**.

**Arquitetura:**
- Backend WA mantém 27 tabelas `wa_*` no mesmo Supabase
- CRM armazena apenas `workspace_integrations` com `wa_tenant_id`
- Provider configurável por workspace: Z-API, Evolution API, Meta Cloud API

**Ponte:**
```
workspaces → workspace_integrations (wa_tenant_id) → wa_tenants → wa_instances/wa_conversations
```

**O que falta:**
- [ ] Tela `/settings/integrations` para configurar integração
- [ ] Listar providers disponíveis (`wa_providers`)
- [ ] Criar/ativar instância (`wa_instances`)
- [ ] Leitura de conversas no Chat/Inbox
- [ ] Envio de mensagens via API WA
- [ ] Webhook HMAC para receber eventos

**Variáveis necessárias (estimadas — ainda não implementado):**
```env
WA_API_BASE_URL=[url_do_backend_wa]
WA_WEBHOOK_SECRET=[hmac_secret]
```

> **Risco identificado:** tokens de integração WA (`wa_token`, `wa_secret`) precisam ser armazenados via Supabase Vault, não em texto no banco.

---

## ViaCEP (via proxy interno)

**Finalidade:** busca de endereço por CEP para preenchimento automático de formulários.

**Onde está implementada:**
- `src/app/api/address/cep/route.ts` — Route Handler proxy

**Por que proxy:** evitar que o browser chame ViaCEP diretamente (vazamento de IP do usuário, sem rate limit, sem validação).

**Configuração:** sem variáveis de ambiente. Chama `viacep.com.br` no servidor.

**Proteções:** rate limit por IP, validação de formato de CEP.

---

## Email (Supabase Auth)

**Finalidade:** confirmação de cadastro, reset de senha.

**Implementação:** delega ao Supabase Auth. Sem configuração própria de SMTP identificada.

> **Ponto em aberto:** não confirmado se email de confirmação está ativo ou se usa confirmação automática do Supabase.

---

## Storage (Supabase Storage)

**Finalidade:** upload de logos de workspace e avatars de usuário.

**Buckets:**
- `workspace-logos` — logos das empresas, acesso privado com RLS
- `avatars` — avatars dos usuários, acesso privado com RLS

**Proteções:** validação de MIME type, magic bytes e tamanho máximo em `upload-actions.ts`.

---

## Integrações inexistentes / não implementadas

| Integração | Observação |
|---|---|
| Billing / pagamentos | Tabela `plans` existe, mas sem lógica de cobrança |
| Email marketing | Não identificado |
| OpenAI / LLM | Não identificado |
| Push notifications | Não identificado |
| Webhooks de entrada (CRM) | Estrutura pendente; sem HMAC |
