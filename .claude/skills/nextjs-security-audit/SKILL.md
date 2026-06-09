---
name: nextjs-security-audit
description: >
  Auditoria completa de segurança para projetos Next.js (App Router / Pages Router). Use esta skill sempre que o usuário
  mencionar "auditar segurança", "security audit", "revisar segurança", "variáveis de ambiente expostas",
  "NEXT_PUBLIC secret", "source maps em produção", "cookies HttpOnly", "headers de segurança", "CSP",
  "Content-Security-Policy", "API Route sem auth", "Server Action segura", "vazando dados no frontend",
  "dados sensíveis no HTML", "IDOR", "CORS inseguro", "proteger rota" ou qualquer combinação de
  "segurança" + "Next.js". Realiza inspeção sistemática dos 17 vetores críticos, gera relatório
  priorizado com evidências de código e propõe correções concretas.
---

## Objetivo

Inspecionar sistematicamente um projeto Next.js para identificar vulnerabilidades de segurança nos 17 vetores críticos do BFF/frontend, gerar relatório estruturado por severidade e produzir código corrigido para cada problema.

## SDDS Context

Before starting any task:
1. Read `.sdds/CURRENT_STATE.md` — estado atual consolidado do projeto
2. Read `.sdds/INDEX.md` — roteador para specs relevantes
3. If relevant, read `.sdds/specs/[módulo-afetado].md` — regras do módulo antes de tocar qualquer arquivo

During execution:
- Never create files or directories outside the structure defined in `.sdds/specs/`
- Never bypass guardrails: do not use `--no-verify`, `--force` on protected branches, or ignore hook errors
- If an architectural decision is made, flag it so the user can record it in `.sdds/decisions/`

After completing the task:
- Report: files changed, decisions made, open questions
- Prompt the user to run `/sdds-update` if the session was substantive

---

## Passo 1 — Mapear arquivos a inspecionar

Antes de auditar, liste os arquivos relevantes. Priorize:

```
.env, .env.local, .env.production, .env.development, .env.example
next.config.js / next.config.ts / next.config.mjs
middleware.ts / middleware.js
src/app/layout.tsx (ou pages/_app.tsx)
src/middleware.ts
Todos os app/api/**/route.ts (Route Handlers)
Todos os app/**/actions.ts (Server Actions)
Todos os pages/api/**/*.ts (Pages Router API)
src/lib/auth.ts ou equivalente
Qualquer arquivo que crie/manipule cookies
```

Leia cada um sistematicamente. Em arquivos > 300 linhas, use `offset` + `limit`.

---

## Passo 2 — Auditar os 12 vetores

### Vetor 1 — NEXT_PUBLIC_* vazando segredos

Inspecione todos os arquivos `.env*`. Marque como **🚨 Crítico** qualquer variável prefixada com `NEXT_PUBLIC_` que contenha:
- tokens, secrets, chaves de API privadas, senhas, hashes
- strings de conexão de banco de dados
- IDs internos de serviços de pagamento (Stripe secret, PagSeguro token)
- qualquer valor que não deva ser legível no browser

`NEXT_PUBLIC_` expõe o valor literalmente no bundle JS do browser — não há proteção possível depois disso.

**Exemplos de violação crítica:**
```
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_...     # 🚨 expõe chave privada
NEXT_PUBLIC_DATABASE_URL=postgresql://...     # 🚨 expõe credenciais do banco
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=eyJ...       # 🚨 expõe service_role key
```

**Permitido:**
```
NEXT_PUBLIC_APP_URL=https://app.exemplo.com   # ✅ URL pública
NEXT_PUBLIC_SUPABASE_URL=https://...          # ✅ URL pública do Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # ✅ anon key é projetada com RLS
```

---

### Vetor 2 — Source Maps em Produção

No `next.config.*`, verifique:

```js
productionBrowserSourceMaps: true  // ⚠️ Alto — expõe código-fonte
```

Também cheque overrides de webpack:
```js
webpack: (config) => {
  config.devtool = 'source-map'  // ⚠️ Alto se sem condicional de NODE_ENV
  return config
}
```

Source maps em produção permitem que qualquer pessoa leia seu código TypeScript/JavaScript original no DevTools. O padrão (false) é seguro.

---

### Vetor 3 — Cookies sem HttpOnly / Secure / SameSite

Busque em todo o código por: `Set-Cookie`, `cookies().set(`, `nookies.set(`, `js-cookie`, `response.cookie(`.

Para cada cookie de sessão/autenticação, verifique presença obrigatória de:
- `HttpOnly` — impede acesso via `document.cookie` (mitigação XSS)
- `Secure` — transmite apenas via HTTPS
- `SameSite=Lax` ou `Strict` — mitigação CSRF

**Violação crítica:**
```js
res.setHeader('Set-Cookie', `session=${token}; Path=/; Max-Age=86400`)
// 🚨 Faltam HttpOnly, Secure, SameSite
```

**Correto:**
```js
res.setHeader('Set-Cookie',
  `session=${token}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`)
```

---

### Vetor 4 — Headers de Segurança HTTP

No `next.config.*` ou `middleware.ts`, verifique presença e configuração correta de:

| Header | Valor seguro | Problema comum |
|---|---|---|
| `Content-Security-Policy` | diretivas específicas por recurso | `unsafe-inline`, `unsafe-eval`, `*` |
| `X-Frame-Options` | `DENY` ou `SAMEORIGIN` | ausente = clickjacking |
| `X-Content-Type-Options` | `nosniff` | ausente |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ausente ou `unsafe-url` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ausente |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | ausente ou max-age < 1 ano |
| `X-Powered-By` | deve ser **removido** | `Next.js` vaza fingerprint |

---

### Vetor 5 — API Routes expondo dados demais

Em cada Route Handler (`app/api/**/route.ts`) e Pages API (`pages/api/**`):

1. Detecte retornos de objetos completos do ORM sem projeção de campos:
```ts
// 🚨 Expõe campos sensíveis (password, hash, internalId...)
return Response.json(await db.user.findMany())
```

2. Detecte stack traces chegando ao cliente:
```ts
catch (err) {
  return Response.json({ error: err.message, stack: err.stack }, { status: 500 })
  // 🚨 Vaza detalhes internos
}
```

3. **Correto:**
```ts
// Projeção explícita
const users = await db.user.findMany({ select: { id: true, name: true, email: true } })

// Erro normalizado
catch (err) {
  console.error(err) // log no servidor
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

### Vetor 6 — Autenticação/Autorização em API Routes

Para cada Route Handler que acessa dados protegidos:

1. **Sem auth:**
```ts
export async function GET() {
  return Response.json(await db.user.findMany()) // 🚨 Sem verificação de sessão
}
```

2. **IDOR (Insecure Direct Object Reference):**
```ts
const post = await db.post.findUnique({ where: { id: params.id } })
// 🚨 Não verifica se o post pertence ao usuário autenticado
```

3. **Correto:**
```ts
const session = await auth() // ou getServerSession()
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

const post = await db.post.findUnique({
  where: { id: params.id, userId: session.user.id } // ✅ filtra por ownership
})
if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
```

---

### Vetor 7 — Server Actions sem proteção

Para cada arquivo `actions.ts` / `"use server"`:

1. **Sem auth:**
```ts
'use server'
export async function deletePost(id: string) {
  await db.post.delete({ where: { id } }) // 🚨 Sem autenticação
}
```

2. **Sem validação de input:**
```ts
export async function createPost(data: any) {
  await db.post.create({ data }) // 🚨 Mass assignment
}
```

3. **Correto:**
```ts
'use server'
export async function deletePost(id: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const post = await db.post.findUnique({ where: { id } })
  if (post?.userId !== session.user.id) throw new Error('Forbidden')

  await db.post.delete({ where: { id } })
}
```

---

### Vetor 8 — Middleware sem proteção de rotas

No `middleware.ts`:

1. Verifique se rotas autenticadas estão no `matcher`
2. Detecte open redirect via input do usuário:
```ts
const redirectUrl = req.nextUrl.searchParams.get('redirect')
return NextResponse.redirect(redirectUrl) // 🚨 Open redirect
```

3. **Correto:**
```ts
export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
}

// Open redirect seguro:
const redirectUrl = req.nextUrl.searchParams.get('redirect')
const safeUrl = redirectUrl?.startsWith('/') ? redirectUrl : '/dashboard'
return NextResponse.redirect(new URL(safeUrl, req.url))
```

---

### Vetor 9 — Dependências com vulnerabilidades

Oriente o usuário a rodar:
```bash
npm audit --audit-level=high
# ou
pnpm audit --audit-level high
```

Cheque versões de pacotes críticos de auth/crypto:
- `next` — deve estar na última minor da major atual
- `next-auth` / `@auth/nextjs` — checar CVEs recentes
- `jose`, `jsonwebtoken` — checar vulnerabilidades de JWT
- Qualquer pacote com `crypto`, `auth`, `jwt`, `session` no nome

---

### Vetor 10 — next.config.* com riscos

1. **SSRF via rewrites:**
```js
rewrites: async () => [{
  source: '/proxy/:path*',
  destination: 'http://:path*'  // 🚨 SSRF — permite requisições a hosts arbitrários
}]
```

2. **Images com wildcard:**
```js
images: { domains: ['*'] }  // ⚠️ Alto — permite qualquer origem
```

3. **SVG perigoso:**
```js
images: { dangerouslyAllowSVG: true }
// ⚠️ Médio — SVGs podem conter scripts; adicione contentDispositionType: 'attachment'
```

4. **publicRuntimeConfig misturado com serverRuntimeConfig:**
```js
// Garantir que segredos estão apenas em serverRuntimeConfig
```

---

### Vetor 11 — Vazamento no __NEXT_DATA__

Em `getServerSideProps` e `getStaticProps` (Pages Router):

```ts
export async function getServerSideProps() {
  const user = await db.user.findUnique(...)
  return { props: { user } } // 🚨 Objeto completo vaza no HTML como __NEXT_DATA__
}
```

Qualquer dado retornado em `props` fica visível no HTML em `<script id="__NEXT_DATA__">`.

**Correto:** retornar apenas os campos necessários para a UI.

---

### Vetor 12 — CORS em API Routes

Detecte:
```ts
return new Response(data, {
  headers: { 'Access-Control-Allow-Origin': '*' }  // 🚨 com dados autenticados
})
```

`*` combinado com `credentials: 'include'` é inválido e inseguro. Configure allowlist:
```ts
const allowedOrigins = ['https://app.exemplo.com', process.env.ALLOWED_ORIGIN]
const origin = req.headers.get('origin')
const corsOrigin = allowedOrigins.includes(origin ?? '') ? origin : allowedOrigins[0]

return new Response(data, {
  headers: { 'Access-Control-Allow-Origin': corsOrigin ?? '' }
})
```

---

### Vetor 13 — XSS (Cross-Site Scripting)

Busque em todo o código por `dangerouslySetInnerHTML`, `.innerHTML =`, `document.write(` e `eval(`.

**🚨 Crítico — `dangerouslySetInnerHTML` sem sanitização:**
```tsx
// 🚨 Se `content` vier do usuário ou banco, XSS direto
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

**🚨 Crítico — innerHTML em useEffect:**
```ts
useEffect(() => {
  ref.current.innerHTML = userInput  // 🚨 XSS
}, [userInput])
```

**Correto:**
```tsx
import DOMPurify from 'dompurify'

// Sanitizar antes de renderizar HTML de usuário
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
```

Também verifique:
- `href={userInput}` sem validação — um `javascript:alert(1)` é XSS via link
- `src={userInput}` em `<script>` ou `<iframe>` dinâmicos
- Interpolação direta em templates de e-mail ou PDF gerados no servidor

**href com protocolo malicioso:**
```tsx
// 🚨 XSS via link
<a href={user.website}>site</a>

// ✅ Validar protocolo
const safeHref = /^https?:\/\//.test(user.website) ? user.website : '#'
<a href={safeHref}>site</a>
```

---

### Vetor 14 — CSRF (Cross-Site Request Forgery)

O Next.js tem comportamentos diferentes para Server Actions e Route Handlers:

**Server Actions — proteção nativa:**
Next.js valida o header `Origin` automaticamente em Server Actions (App Router). Essa proteção existe desde Next.js 14.0. **Verificar se a versão do projeto é ≥ 14.0.**

```ts
// Se next < 14, Server Actions NÃO têm proteção CSRF nativa
// Checar package.json: "next": "^14.x.x"
```

**Route Handlers — SEM proteção automática:**
```ts
// app/api/transfer/route.ts
export async function POST(req: Request) {
  const { amount, to } = await req.json()
  await transfer(amount, to)  // 🚨 Sem verificação de Origin — vulnerável a CSRF
}
```

**Correto para Route Handlers com mutações:**
```ts
export async function POST(req: Request) {
  // Verificar Origin contra host esperado
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || !origin.includes(host ?? '')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... processar
}
```

**SameSite=Lax nos cookies mitiga CSRF para navegação top-level** mas não protege contra requisições cross-origin via `fetch`. Documentar claramente qual proteção está ativa.

---

### Vetor 15 — Upload de Arquivos

Busque por `formData.get('file')`, `req.formData()`, `multer`, `busboy`, `put` em Storage do Supabase/S3.

**🚨 Crítico — sem validação de tipo:**
```ts
const file = formData.get('file') as File
await storage.upload(file.name, await file.arrayBuffer())
// 🚨 Aceita qualquer arquivo — .exe, .php, .svg com script, etc.
```

**🚨 Crítico — confiar no MIME do cliente:**
```ts
if (file.type === 'image/jpeg') { ... }
// 🚨 file.type vem do cliente — trivial de falsificar
```

**Correto — validar magic bytes no servidor:**
```ts
const ALLOWED_MAGIC = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
}
const MAX_SIZE = 5 * 1024 * 1024  // 5MB

async function validateUpload(file: File) {
  // 1. Tamanho
  if (file.size > MAX_SIZE) throw new Error('File too large')

  // 2. Extensão (whitelist)
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'pdf', 'webp'].includes(ext ?? '')) {
    throw new Error('File type not allowed')
  }

  // 3. Magic bytes (não confiar no MIME do cliente)
  const buffer = new Uint8Array(await file.arrayBuffer())
  const magic = ALLOWED_MAGIC[file.type as keyof typeof ALLOWED_MAGIC]
  if (!magic || !magic.every((byte, i) => buffer[i] === byte)) {
    throw new Error('File content does not match type')
  }
}
```

Verifique também:
- Path traversal em nomes de arquivo: `../../etc/passwd`
- Arquivos servidos com `Content-Disposition: inline` quando deveriam ser `attachment`
- SVGs com `<script>` sendo servidos com `Content-Type: image/svg+xml` (permite XSS)

---

### Vetor 16 — SSRF via fetch() em Server Actions / Route Handlers

Busque por `fetch(`, `axios.get(`, `got(` dentro de arquivos `"use server"` ou Route Handlers onde a URL vem de parâmetro do usuário.

**🚨 Crítico — URL controlada pelo usuário:**
```ts
'use server'
export async function fetchPreview(url: string) {
  const res = await fetch(url)       // 🚨 SSRF
  return res.text()
}
```

Um atacante pode passar:
- `http://169.254.169.254/latest/meta-data/` — metadata da instância cloud (AWS/GCP/Azure)
- `http://localhost:5432` — portas internas não expostas
- `file:///etc/passwd` — leitura de arquivos locais (em alguns runtimes)

**Correto — allowlist de domínios:**
```ts
const ALLOWED_HOSTS = ['api.exemplo.com', 'cdn.exemplo.com']

export async function fetchPreview(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error('Host not allowed')
  }

  // Forçar HTTPS em produção
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS allowed')
  }

  const res = await fetch(parsed.toString())
  return res.text()
}
```

Também verifique `rewrites` no `next.config` com destinos dinâmicos (já coberto no vetor 10, mas reforçar para fetch direto).

---

### Vetor 17 — Dados sensíveis em logs

Busque por `console.log(`, `console.error(`, `console.warn(` em arquivos de servidor (Server Actions, Route Handlers, middleware, lib/).

**🚨 Crítico — logar objetos completos com tokens/PII:**
```ts
console.log('User:', user)           // 🚨 pode conter passwordHash, tokens
console.error('Auth error:', error)  // 🚨 error.message pode conter credenciais
console.log('Session:', session)     // 🚨 contém access_token, refresh_token
console.log('Request body:', body)   // 🚨 pode conter senhas em formulários de login
```

**🚨 Crítico — logar variáveis de ambiente:**
```ts
console.log('Config:', process.env)  // 🚨 expõe TODOS os segredos no log
```

**Correto:**
```ts
// Log de sessão sem tokens
console.log('User authenticated:', { userId: session.user.id, role: session.user.role })

// Log de erro sem stack/message internos em produção
console.error('[AuthError]', {
  code: error.code,        // código genérico
  userId: session?.user.id // contexto útil sem dado sensível
})

// NUNCA logar: password, token, secret, hash, key, authorization header
```

Campos que **nunca devem aparecer em logs:**
- `password`, `passwordHash`, `salt`
- `access_token`, `refresh_token`, `id_token`
- `authorization` (header)
- `stripe_secret`, `webhook_secret`, qualquer `*_key` ou `*_secret`
- Conteúdo de `process.env` (logar a variável inteira)
- Payloads de formulários de login/register

---

## Passo 3 — Gerar relatório

Estruture o relatório assim:

```
## Relatório de Segurança Next.js — [data]

### Resumo executivo
- 🚨 X problemas críticos
- ⚠️ Y avisos (risco médio/alto)
- ✅ Z itens verificados e OK

### Problemas críticos (corrigir imediatamente)
#### [Vetor N] — Descrição do problema
**Arquivo:** `path/to/file.ts`
**Linha:** N
**Problema:** explicação concisa do risco
**Trecho problemático:**
```ts
// código com o problema
```
**Correto:**
```ts
// código corrigido
```

### Avisos (melhorar antes do próximo deploy)
[mesma estrutura]

### Itens OK
- ✅ Vetor N: descrição do que foi verificado e está correto

### Checklist de PR
[ ] Todos os críticos corrigidos
[ ] Avisos endereçados ou aceitos com justificativa
[ ] `npm audit` sem vulnerabilidades high/critical
[ ] Headers de segurança validados
```

---

## Passo 4 — Arquivos de referência

Para correções de headers de segurança, consulte `references/config-examples.md`.
Para snippets de correção prontos, consulte `references/fixes.md`.
Para checklist completo de PR/CI, consulte `references/checklist.md`.

---

## Relação com outras skills de segurança

Esta skill cobre os **12 vetores genéricos Next.js**. Para vetores específicos deste projeto, use a skill complementar:

### `security-review-gate` — use para:
- **Supabase / RLS** — políticas, `workspace_id` derivado da sessão, `service_role` isolado
- **Multi-tenant** — isolamento de dados entre workspaces, queries com `workspace_id`
- **Gate pré-commit** — checklist rápido antes de consolidar qualquer mudança sensível em git
- **Z-API / webhooks** — validação de tokens, HMAC, proteção de endpoints

As duas skills são **complementares**, não redundantes:

| Skill | Quando usar | Escopo |
|---|---|---|
| `nextjs-security-audit` | Auditoria profunda, onboarding, pré-deploy | Qualquer projeto Next.js |
| `security-review-gate` | Antes de cada commit/push em código sensível | Este projeto (Supabase + multi-tenant) |

Se a auditoria encontrar problemas em queries Supabase, RLS ou multi-tenant, consulte `security-review-gate` para as regras específicas deste projeto antes de propor a correção.

---

## Severidades

| Nível | Critério | Prazo |
|---|---|---|
| 🚨 Crítico | Exposição imediata de dados, bypass de auth, credenciais expostas | Bloquear deploy |
| ⚠️ Alto | Facilita ataques (XSS, clickjacking, CSRF) mas requer condição adicional | Antes do próximo deploy |
| ⚠️ Médio | Aumenta superfície de ataque, má prática documentada | Sprint atual |
| ℹ️ Baixo | Hardening extra, defesa em profundidade | Backlog |
