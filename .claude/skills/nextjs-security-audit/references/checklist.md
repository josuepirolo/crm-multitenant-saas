# Checklist de Segurança Next.js — PR / CI Gate

Use como checklist antes de merge em produção.

## 🔑 Variáveis de Ambiente
- [ ] Nenhuma variável `NEXT_PUBLIC_*` contém token, secret, chave privada ou string de conexão
- [ ] Todos os segredos estão em variáveis sem o prefixo `NEXT_PUBLIC_`
- [ ] `.env.example` documenta todas as vars necessárias sem valores reais
- [ ] `.env.local` está no `.gitignore`

## 🗺️ Source Maps
- [ ] `productionBrowserSourceMaps` está `false` (ou ausente — o padrão é false)
- [ ] Overrides de webpack não geram `source-map` em `NODE_ENV=production`

## 🍪 Cookies
- [ ] Todos os cookies de sessão/auth têm `HttpOnly`
- [ ] Todos os cookies de sessão/auth têm `Secure` (em produção)
- [ ] Todos os cookies de sessão/auth têm `SameSite=Lax` ou `Strict`
- [ ] Nenhum token JWT está em `localStorage` ou `sessionStorage`

## 🔒 Headers HTTP
- [ ] `Content-Security-Policy` presente e sem `unsafe-inline`/`unsafe-eval`/`*`
- [ ] `X-Frame-Options: DENY` ou CSP com `frame-ancestors 'none'`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` desabilita camera/microphone/geolocation
- [ ] `Strict-Transport-Security` com `max-age` ≥ 1 ano
- [ ] `X-Powered-By` removido (`poweredByHeader: false` no next.config)

## 🛡️ API Routes / Route Handlers
- [ ] Toda rota protegida verifica sessão antes de processar
- [ ] Nenhuma rota retorna objetos completos do banco sem projeção de campos
- [ ] Nenhuma rota retorna `err.message` ou `err.stack` ao cliente em produção
- [ ] Queries filtram por ownership (`userId` ou `workspaceId` do contexto de sessão)
- [ ] CORS configurado com allowlist explícita (não `*`) em rotas autenticadas

## ⚡ Server Actions
- [ ] Todas as actions verificam autenticação antes de executar
- [ ] Todos os inputs são validados com Zod antes de persistir
- [ ] Operações destrutivas verificam ownership do recurso
- [ ] `"use server"` não está em arquivos que exportam dados sensíveis

## 🚦 Middleware
- [ ] `matcher` cobre todas as rotas autenticadas
- [ ] Nenhum redirect usa URL diretamente do request sem validação
- [ ] Assets públicos (`/_next/`, `/favicon.ico`, etc.) excluídos do matcher

## 📦 Dependências
- [ ] `npm audit --audit-level=high` sem resultados
- [ ] `next`, `next-auth`/`@auth`, `jose`, `jsonwebtoken` em versões sem CVEs conhecidos

## 🌐 next.config
- [ ] `rewrites` não fazem proxy de URLs arbitrárias (SSRF)
- [ ] `images.remotePatterns` não usa wildcard `**` sem restrição de hostname
- [ ] `dangerouslyAllowSVG: true` acompanhado de `contentDispositionType: 'attachment'`
- [ ] Segredos estão apenas em `serverRuntimeConfig`, nunca em `publicRuntimeConfig`

## 📄 Dados no HTML (__NEXT_DATA__)
- [ ] `getServerSideProps` / `getStaticProps` não retornam campos sensíveis nos `props`
- [ ] Nenhum `JSON.stringify` de objeto completo do banco passado para o cliente

## 🛡️ XSS
- [ ] Nenhum `dangerouslySetInnerHTML` sem `DOMPurify.sanitize()` antes
- [ ] Nenhum `.innerHTML =` com dados de usuário
- [ ] Links com `href={userInput}` validam protocolo (`/^https?:\/\//`)
- [ ] Sem `eval()` ou `new Function()` com input de usuário

## 🔄 CSRF
- [ ] `next` ≥ 14.0 (Server Actions têm proteção nativa de Origin)
- [ ] Route Handlers com mutações verificam header `Origin` ou usam token CSRF
- [ ] Cookies de sessão com `SameSite=Lax` ou `Strict`

## 📎 Upload de Arquivos
- [ ] Tamanho máximo validado no servidor (não confiar no `Content-Length` do cliente)
- [ ] Extensão em whitelist explícita
- [ ] Magic bytes validados no servidor (não confiar em `file.type` do cliente)
- [ ] Nome de arquivo sanitizado (sem `../`, sem path traversal)
- [ ] SVGs servidos com `Content-Disposition: attachment` ou bloqueados
- [ ] Arquivos de download servidos com `Content-Disposition: attachment`

## 🌐 SSRF
- [ ] Nenhum `fetch(userInput)` direto em Server Actions ou Route Handlers
- [ ] URLs externas validadas contra allowlist de domínios antes do fetch
- [ ] Em produção, apenas `https:` permitido em URLs dinâmicas
- [ ] `next.config` rewrites não usam destinos com segmentos dinâmicos de URL

## 📋 Logs
- [ ] Nenhum `console.log(session)`, `console.log(user)` ou `console.log(process.env)`
- [ ] Nenhum `console.log` de payloads de formulário de login/register
- [ ] Logs de erro não expõem `err.stack` ou `err.message` com dados internos
- [ ] Campos `password`, `token`, `secret`, `hash`, `key` ausentes em todos os logs
- [ ] Headers `authorization` não aparecem em logs

## 🔐 Multi-tenant (quando aplicável)
- [ ] Queries sempre filtram por `workspace_id` derivado da sessão, nunca do cliente
- [ ] RLS ativo nas tabelas do banco
- [ ] `service_role` não usado em fluxos de usuário comum
