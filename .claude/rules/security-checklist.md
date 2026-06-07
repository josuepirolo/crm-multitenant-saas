# 🔒 CHECKLIST COMPLETO DE SEGURANÇA — SaaS (Next.js + Supabase + Z-API)

> Última atualização: 2026-04-29

---

# 🧠 1. PRINCÍPIO GLOBAL (REGRA MÃE)

- [x] TODO acesso a dados depende de RLS  
- [x] NENHUMA regra crítica depende do frontend  
- [x] NENHUM segredo é exposto ao client  
- [x] service_role NÃO é usado em fluxos de usuário  

---

# 🌐 2. FRONT-END (Next.js Client)

## 🤖 Anti-bot / abuso

- [x] Challenge ativo (Cloudflare Turnstile) — verificação única feita pelo Supabase Auth (GoTrue) via `captchaToken` em `src/app/(auth)/actions.ts`; falhas traduzidas por `isCaptchaError`/`CAPTCHA_ERROR` em `src/lib/security/security-errors.ts`  
- [x] Proteção aplicada em:
  - [x] Login  
  - [x] Registro  
  - [x] Reset de senha  
- [x] Rate limit por IP (backend — `src/lib/security/rate-limit.ts`)  

---

## 🔐 Segurança de requisição

- [x] Todas requisições usam HTTPS (HSTS configurado em next.config.ts)  
- [x] Nenhuma chamada direta para APIs externas sensíveis — CEP via `/api/address/cep`  
- [x] Nenhum token exposto em variáveis NEXT_PUBLIC_  

---

## 🧾 Validação

- [x] Inputs validados no frontend (UX) — Zod + react-hook-form  
- [x] NÃO confiar na validação do frontend — Zod revalidado no servidor  

---

## 🍪 Sessão

- [x] Sessão gerenciada via cookies seguros — `@supabase/ssr`  
- [x] NÃO armazenar token em localStorage  

---

# ⚙️ 3. BACKEND (Next.js Server / API Routes / Actions)

## 🔑 Autenticação

- [x] Todas rotas protegidas validam usuário autenticado — `getWorkspaceContext` / `requireSuperAdmin`  
- [x] Nenhuma rota sensível funciona sem sessão válida  

---

## 🧠 Autorização

- [x] Backend valida empresa (`workspace_id` do contexto autenticado, nunca do client)  
- [x] Backend valida permissões (RBAC + fallback hardcoded)  
- [x] Backend NUNCA confia no tenant vindo do client  

---

## 🚫 Uso de service_role

- [x] service_role NÃO usado em rotas de usuário  
- [x] service_role NÃO usado com input do usuário  
- [x] Uso existente:
  - [x] audit_logs: append-only via admin (documentado)  
  - [x] lookup email no invite: isolado, sem input livre  
  - [x] admin actions: protegidos por `requireSuperAdmin`  

---

## 🔗 Integrações externas (Z-API e outras)

- [ ] Z-API: **NÃO IMPLEMENTADO** — pendente  
- [ ] Tokens Z-API armazenados com segurança  
- [ ] Nunca retornar token para o client  

---

## 📥 Webhooks

- [ ] Endpoint protegido por token secreto — **PENDENTE**  
- [ ] Origem validada (IP ou assinatura HMAC)  
- [ ] Payload validado  

---

## 🧱 Validação de dados

- [x] Toda entrada validada no backend (Zod em todas as Server Actions)  
- [x] IDs validados (workspace_id do contexto, UUID validation)  
- [x] Sanitização de inputs (trim, tipo, tamanho, magic bytes em uploads)  

---

## 🚦 Rate limit (backend)

- [x] Login limitado por IP e email  
- [x] Register limitado por IP  
- [x] Forgot/reset password limitado  
- [x] API de CEP limitada por IP  
- [ ] Envio de mensagens limitado — pendente (Z-API não implementado)  

---

# 🗄️ 4. SUPABASE (BANCO + AUTH)

## 🔐 RLS (CRÍTICO)

- [x] RLS ATIVA em TODAS as tabelas sensíveis  
- [x] Nenhuma tabela exposta sem RLS  
- [x] storage.objects com RLS (workspace-logos e avatars)  

---

## 🏢 Multi-tenant

- [x] Todas tabelas possuem workspace_id  
- [x] Policies SEMPRE filtram por workspace_id (via `my_workspace_ids()` SECURITY DEFINER)  
- [x] Super Admin tratado via `is_superadmin` role, não bypass de RLS  

---

## 👤 Auth

- [x] Usuários autenticados obrigatoriamente  
- [x] Password reset seguro (Supabase Auth)  

---

## 🔑 Policies

- [x] SELECT respeita workspace_id  
- [x] INSERT força workspace_id do usuário  
- [x] UPDATE valida ownership  
- [x] DELETE validado por permissão  

---

## 🚫 Segurança de acesso

- [x] service_role nunca exposto no client  
- [x] anon key usada com RLS  
- [x] Políticas revisadas — fix recursão `workspace_members` aplicado (2026-04-29)  

---

# 🍪 5. SESSÃO E ROUBO DE ACESSO

- [x] Cookies HTTP-only (`@supabase/ssr`)  
- [x] Cookies Secure  
- [x] SameSite=Lax configurado  

---

## 🧠 Proteções extras

- [x] Refresh token com rotação (Supabase Auth padrão)  
- [x] Logout invalida sessão no servidor  

---

# 📊 6. LOGS E AUDITORIA

- [x] Log de login (`LOGIN_SUCCESS`, `LOGIN_FAILURE`)  
- [x] Log de ações críticas (workspace, members, RBAC, impersonation, upload, perfil)  
- [ ] Log de envio de mensagens — pendente (Z-API não implementado)  
- [x] Log de alterações de dados (contacts, workspace)  
- [x] session_id + fingerprint SHA-256 em todos os logs  
- [x] Metadata sanitizada (sem passwords/tokens)  

---

## 🔍 Rastreabilidade

- [x] Quem fez? (`user_id`)  
- [x] Quando fez? (`created_at`)  
- [x] O que fez? (`action` + `entity_type` + `entity_id`)  

---

# 🧪 7. TESTES AUTOMATIZADOS

## 🔥 RLS

- [x] Usuário NÃO consegue acessar dados de outra empresa  
- [x] Usuário NÃO consegue forçar empresa_id manualmente  

---

## 🔐 Auth

- [x] Rota protegida falha sem login  
- [x] Sessão inválida é rejeitada  

---

## 🧠 Permissões

- [x] Vendedor NÃO acessa dados de outro vendedor  
- [x] Admin acessa apenas empresa dele  

---

## 🚫 Segurança

- [x] Nenhum endpoint retorna tokens  
- [x] Nenhuma variável sensível exposta  
- [x] Upload: magic bytes validados, MIME whitelist, tamanho  
- [x] CEP API: validação, rate limit, sem chamada direta ao ViaCEP  
- [x] CPF/CNPJ: algoritmo Receita Federal testado  

---

## 🔗 Integração

- [ ] Front NÃO chama Z-API direto — **PENDENTE** (Z-API não implementado)  
- [ ] Backend chama Z-API corretamente — **PENDENTE**  

---

## 📥 Webhook

- [ ] Requisição sem token é rejeitada — **PENDENTE**  
- [ ] Payload inválido é rejeitado — **PENDENTE**  

---

# 🚀 8. NÍVEL ENTERPRISE (OPCIONAL)

- [ ] 2FA para admins  
- [ ] Limite de sessões simultâneas  
- [ ] Blacklist de IP  
- [ ] Proteção contra brute force avançado  

---

# 📋 Pendências reais (por prioridade)

1. **Z-API integration** — chamadas externas, tokens, webhooks
2. **Webhook secret + HMAC** — quando Z-API for integrado
3. **Log de mensagens** — quando chat for implementado
4. **2FA para admins** — enterprise, opcional

# PROMPT PARA CLAUDE CODE — IMPLEMENTAR RATE LIMIT + AUDITORIA + HARDENING DE SEGURANÇA

Você é um engenheiro sênior especialista em segurança para SaaS multi-tenant com Next.js, Supabase, RLS, Server Actions, API Routes e testes automatizados.

## Contexto atual

O projeto já possui uma suíte de segurança com aproximadamente 60 testes cobrindo:

- RLS com anon key
- RLS com usuários reais autenticados
- isolamento multi-tenant
- bloqueio cross-tenant em SELECT, INSERT, UPDATE e DELETE
- service_role isolado
- ausência de secrets no client
- Server Actions usando workspace_id do contexto autenticado

A base multi-tenant já está validada.

Agora o objetivo é implementar a próxima camada de segurança:

1. Rate limit
2. Auditoria
3. Headers de segurança
4. Hardening de sessão e respostas
5. Testes automatizados para tudo isso

---

# REGRAS OBRIGATÓRIAS

Antes de alterar qualquer arquivo:

- Leia `CLAUDE.md`, se existir.
- Leia `.cursorrules`, se existir.
- Leia a documentação de arquitetura do projeto.
- Leia os testes atuais de segurança.
- Entenda a estrutura existente antes de criar qualquer coisa nova.

Não faça refatoração grande sem necessidade.

Não quebre os testes existentes.

Não use `service_role` em fluxo de usuário.

Não exponha secrets.

Não coloque token, senha, secret, service_role key ou dados sensíveis em logs.

Não crie solução hardcoded espalhada pelo projeto.

Tudo deve ser modular, reutilizável e testável.

---

# OBJETIVO 1 — RATE LIMIT

Implementar rate limit centralizado para rotas e ações sensíveis.

## Deve proteger:

- Login
- Register
- Forgot password
- Reset password
- Server Actions sensíveis
- Futuramente: envio de mensagem, convite de usuário e alterações críticas

## Requisitos técnicos

Criar uma camada reutilizável de rate limit.

A implementação deve suportar pelo menos:

- limite por IP
- limite por e-mail/login, quando aplicável
- limite por usuário autenticado, quando aplicável
- janela de tempo configurável
- bloqueio temporário
- resposta genérica sem revelar informação sensível

## Sugestão de estrutura

Criar algo parecido com:

- `src/lib/security/rate-limit.ts`
- `src/lib/security/client-ip.ts`
- `src/lib/security/security-errors.ts`

Mas respeite a estrutura real do projeto.

## Comportamento esperado

- Muitas tentativas de login devem ser bloqueadas.
- Muitas tentativas de reset de senha devem ser bloqueadas.
- Muitas tentativas de registro devem ser bloqueadas.
- O erro retornado deve ser genérico.
- Nunca retornar:
  - “e-mail existe”
  - “e-mail não existe”
  - stack trace
  - detalhe interno

## Importante

Se o projeto já usa Redis, Upstash, KV, Supabase ou outro storage, aproveite.

Se não existir storage adequado, implemente uma versão inicial segura e bem isolada, documentando limitação para produção.

Não usar memória local como solução final sem documentar claramente que isso não escala em ambiente serverless/multi-instance.

---

# OBJETIVO 2 — AUDITORIA

Criar auditoria básica de ações críticas.

## Criar ou validar existência de tabela

Criar tabela ou migration para algo como:

- `audit_logs`

Campos mínimos:

- `id`
- `workspace_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `ip_address`
- `user_agent`
- `metadata`
- `created_at`

## Regras

- `workspace_id` obrigatório quando a ação for de tenant.
- `user_id` obrigatório quando houver usuário autenticado.
- `metadata` nunca pode conter senha, token, secret ou dados sensíveis.
- Logs devem ser append-only.
- Usuários comuns não devem conseguir editar logs.
- Leitura de logs deve respeitar RLS.
- Super admin, se existir, deve acessar por policy explícita, não por service_role.

## Ações que devem gerar auditoria

Implementar nos pontos já existentes, se aplicável:

- login bem-sucedido
- falha relevante de login
- rate limit acionado
- criação de workspace
- atualização de workspace
- convite de membro
- desativação de membro
- alteração de role/permissão
- criação/edição/remoção de contato, se já existir fluxo

Não inventar fluxo que não existe. Apenas instrumentar o que existe.

Criar helper reutilizável, algo como:

- `src/lib/audit/audit-log.ts`

---

# OBJETIVO 3 — HEADERS DE SEGURANÇA

Configurar headers de segurança no Next.js.

Validar e implementar, quando possível:

- `Content-Security-Policy`
- `X-Frame-Options` ou `frame-ancestors`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `Strict-Transport-Security`
- proteção contra clickjacking
- não exposição de stack trace em produção

A CSP deve ser compatível com Supabase, Cloudflare Turnstile e recursos realmente usados pelo projeto.

Não criar CSP tão restritiva que quebre login, assets, fontes, imagens ou Turnstile.

---

# OBJETIVO 4 — HARDENING DE SESSÃO E ERROS

Validar e ajustar:

- Rotas protegidas rejeitam sessão ausente.
- Sessão inválida não acessa dados.
- Logout invalida acesso posterior.
- Server Actions não retornam stack trace.
- Erros públicos são genéricos.
- Erros internos são logados com segurança, sem secrets.

Criar helpers se necessário:

- `safeError`
- `publicError`
- `sanitizeError`
- ou equivalente já existente no projeto.

---

# OBJETIVO 5 — TESTES AUTOMATIZADOS

Criar testes para a nova camada sem quebrar a suíte atual.

## Testes de rate limit

Criar testes que validem:

- login bloqueia após excesso de tentativas
- register bloqueia após excesso de tentativas
- forgot-password bloqueia após excesso de tentativas
- reset-password bloqueia após excesso de tentativas, se aplicável
- rate limit por IP funciona
- rate limit por e-mail funciona
- erro é genérico
- auditoria registra rate limit acionado

## Testes de auditoria

Validar:

- ação crítica cria log
- log possui user_id
- log possui workspace_id quando aplicável
- log possui action
- log possui created_at
- metadata não contém senha/token/secret
- usuário comum não consegue alterar log
- RLS protege audit_logs

## Testes de headers

Validar:

- HSTS presente em produção, se aplicável
- X-Content-Type-Options presente
- Referrer-Policy presente
- Permissions-Policy presente
- CSP presente
- anti-clickjacking presente

## Testes de hardening

Validar:

- Server Action sem sessão falha
- erro interno não vaza stack trace
- response não retorna secrets
- client bundle não contém service_role
- client bundle não contém tokens sensíveis

---

# CRITÉRIOS DE ACEITE

A implementação só estará concluída quando:

- Todos os testes antigos continuarem passando.
- Novos testes forem criados.
- Rate limit estiver ativo nos fluxos sensíveis.
- Auditoria estiver funcionando nos fluxos críticos existentes.
- Headers de segurança estiverem configurados.
- Nenhum segredo for exposto no client.
- Nenhum fluxo de usuário usar service_role.
- Nenhuma resposta pública vazar stack trace.
- A documentação for atualizada.

---

# DOCUMENTAÇÃO

Atualizar ou criar documentação em:

- `docs/security/`
- ou local equivalente já usado no projeto

Documentar:

- como funciona o rate limit
- onde ele é aplicado
- como funciona audit_logs
- quais ações são auditadas
- quais headers foram configurados
- como rodar os testes de segurança

---

# ENTREGA FINAL

Ao final, retorne um resumo com:

1. Arquivos criados
2. Arquivos alterados
3. Testes criados
4. Comando para rodar os testes
5. Riscos resolvidos
6. Lacunas restantes

Não finalizar enquanto houver teste quebrando.

# 🎯 RESUMO

Se isso estiver OK:

RLS forte + anon key + validação backend + nada de service_role

→ seu SaaS está seguro de verdade

---

# 🧨 FRASE FINAL

Frontend protege contra bot.  
Backend protege contra hacker.  
RLS protege contra vazamento.