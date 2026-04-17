# Security Standards

## Princípio fundamental
Segurança não é opcional. Todo código gerado deve seguir práticas seguras por padrão, especialmente por ser um SaaS multi-tenant com dados sensíveis de clientes.

## Multi-tenancy — isolamento de dados (prioridade máxima)
- **Toda query ao Supabase deve filtrar por `workspace_id`** — nunca retornar dados sem esse filtro
- Nunca confiar no `workspace_id` vindo do cliente — sempre derivar do contexto autenticado (sessão/JWT)
- Usar Row Level Security (RLS) no Supabase em **todas as tabelas** — o RLS é a última linha de defesa
- Nunca desabilitar RLS em tabelas com dados de usuários, mesmo temporariamente

## Autenticação e sessões
- Usar Supabase Auth com `@supabase/ssr` — nunca implementar auth manual
- Tokens JWT armazenados exclusivamente em cookies **HttpOnly + Secure + SameSite=Lax**
- Nunca armazenar tokens em `localStorage` ou `sessionStorage` — vulnerável a XSS
- Session ID nunca deve aparecer em URLs (query string) — sempre via cookie HttpOnly
- Refresh tokens com rotação ativada — invalidar o token anterior a cada renovação
- Implementar logout que invalida a sessão no servidor (não apenas limpa o cookie)
- Timeout de sessão inativa — redirecionar para login após período sem atividade
- Validar sessão no servidor em toda route que acessa dados protegidos
- Middleware Next.js deve verificar autenticação antes de qualquer rota do dashboard

## Cookies
- Todos os cookies de sessão/auth com flags: `HttpOnly; Secure; SameSite=Lax; Path=/`
- Nunca usar `SameSite=None` sem justificativa explícita e apenas com `Secure`
- Prefixar cookies sensíveis com `__Host-` para prevenir subdomain takeover
- Definir `Max-Age` explícito — nunca deixar cookie de sessão sem expiração

## CORS
- Configurar CORS restritivo nas Route Handlers — apenas origens conhecidas e autorizadas
- Nunca usar `Access-Control-Allow-Origin: *` em endpoints autenticados
- Whitelist explícita de origens por ambiente (dev/staging/prod) via variável de ambiente
- Métodos permitidos explícitos — nunca permitir todos os métodos por padrão
- `Access-Control-Allow-Credentials: true` somente quando estritamente necessário

## Headers de segurança HTTP
Configurar no `next.config.js` para todas as respostas:
- `Content-Security-Policy` — restringir fontes de scripts, estilos e iframes
- `X-Frame-Options: DENY` — prevenir clickjacking
- `X-Content-Type-Options: nosniff` — prevenir MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — desabilitar features não usadas (camera, microphone, geolocation)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — forçar HTTPS

## Tokens e segredos
- Tokens de API de terceiros (WhatsApp, webhooks) armazenados no Supabase Vault ou variáveis de ambiente — nunca no banco em texto puro
- Webhook secrets validados via HMAC-SHA256 — rejeitar requisições sem assinatura válida
- Tokens de convite/reset de senha com expiração curta (15-60 min) e uso único
- Nunca logar tokens, chaves, senhas ou dados de sessão — mesmo em desenvolvimento
- API keys internas com escopo mínimo necessário (principle of least privilege)

## Validação de entrada
- **Nunca confiar em dados do cliente** — validar tudo com Zod antes de usar
- Validar no servidor (Route Handlers / Server Actions) além do cliente
- Sanitizar inputs antes de exibir conteúdo gerado por usuários (evitar XSS)
- Nunca concatenar strings em queries SQL — usar sempre queries parametrizadas do Supabase
- Limitar tamanho de payloads nas Route Handlers — rejeitar requisições acima do limite

## Variáveis de ambiente e segredos
- Chaves privadas do Supabase (`service_role`) apenas no servidor — nunca expor no cliente
- Apenas `NEXT_PUBLIC_*` vars podem ir para o cliente
- Nunca commitar `.env*` no repositório — manter no `.gitignore`
- Documentar todas as env vars necessárias em `.env.example` sem valores reais

## APIs e Route Handlers
- Verificar autenticação no início de todo Route Handler
- Verificar autorização: o usuário autenticado tem acesso ao recurso solicitado?
- Rate limiting em endpoints sensíveis (login, registro, envio de mensagens)
- Nunca retornar stack traces ou detalhes internos em erros de produção
- Respostas de erro genéricas para o cliente — detalhes apenas nos logs do servidor

## Proteção contra ataques comuns
- **CSRF:** usar tokens CSRF ou verificar `Origin`/`Referer` em mutações via formulário
- **XSS:** nunca usar `dangerouslySetInnerHTML` sem sanitização — usar DOMPurify se necessário
- **Clickjacking:** `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`
- **Open Redirect:** validar URLs de redirecionamento — nunca redirecionar para URL externa arbitrária
- **Mass Assignment:** nunca passar objetos do cliente direto para o banco — mapear campos explicitamente
- **IDOR:** sempre verificar que o recurso solicitado pertence ao workspace do usuário autenticado

## Dados sensíveis
- Nunca logar tokens, senhas, chaves ou dados pessoais
- PII (nome, telefone, email de contatos) deve respeitar LGPD — não expor desnecessariamente
- Não armazenar credenciais de integrações WhatsApp em texto puro — usar Supabase Vault
- Dados de cartão de crédito nunca passam pelo servidor — usar provider de pagamento (Stripe, etc.)

## Dependências
- Não adicionar dependências sem verificar se são mantidas ativamente
- Preferir libs com histórico de segurança conhecido (evitar libs obscuras para funções críticas)

## Revisão de segurança antes de entregar
- [ ] Toda query filtra por `workspace_id`?
- [ ] RLS está ativo na tabela envolvida?
- [ ] Inputs estão sendo validados com Zod no servidor?
- [ ] Nenhuma chave privada exposta no cliente?
- [ ] Autenticação verificada antes de acessar dados?
- [ ] Cookies de sessão com HttpOnly + Secure + SameSite?
- [ ] Session ID fora de URLs?
- [ ] CORS configurado com whitelist explícita?
- [ ] Headers de segurança HTTP configurados?
- [ ] Webhook validado com HMAC?
- [ ] Nenhum token armazenado em localStorage?
