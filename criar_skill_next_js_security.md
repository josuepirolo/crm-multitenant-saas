# Prompt: Criar Skill de Auditoria de Segurança Next.js

Use este prompt em uma nova conversa com Claude (preferencialmente no Claude Code, onde há acesso ao filesystem e subagentes):

---

## PROMPT PARA COLAR NO CLAUDE

Quero criar uma skill chamada `nextjs-security-audit` que audita e garante segurança em projetos Next.js (frontend + BFF/backend do frontend).

### O que a skill deve fazer

Quando ativada, Claude deve realizar uma auditoria completa de segurança e/ou orientar sobre boas práticas, cobrindo obrigatoriamente estas categorias:

---

#### 1. Variáveis de Ambiente — `NEXT_PUBLIC_*`
- Detectar segredos, tokens, chaves de API, credenciais de banco, IDs internos ou qualquer dado sensível em variáveis `NEXT_PUBLIC_*` (que são expostas ao browser)
- Verificar `.env`, `.env.local`, `.env.production`, `.env.development`
- Checar se `NEXT_PUBLIC_` é usado apenas para dados verdadeiramente públicos (ex: URL base da app, feature flags não-sensíveis)
- Exemplos de violação: `NEXT_PUBLIC_DATABASE_URL`, `NEXT_PUBLIC_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_SECRET`

#### 2. Source Maps em Produção
- Verificar se `productionBrowserSourceMaps` está `false` (padrão) ou `true` no `next.config.js/ts`
- Se `true`, alertar: source maps expõem código-fonte original ao browser em produção
- Checar se `webpack` config customizada não está gerando source maps acidentalmente
- Verificar configuração de `devtool` no webpack override

#### 3. Cookies — HttpOnly, Secure, SameSite
- Auditar toda criação de cookies: `res.setHeader('Set-Cookie', ...)`, `cookies().set(...)`, `nookies.set(...)`, `js-cookie`, `cookie` package
- Garantir que cookies de sessão/autenticação tenham: `HttpOnly=true`, `Secure=true` (em produção), `SameSite=Strict` ou `Lax`
- Detectar cookies sem `HttpOnly` que armazenam tokens/sessões
- Detectar cookies sem `Secure` em contextos de produção

#### 4. Headers de Segurança HTTP
Verificar se o `next.config.js` ou middleware configura os headers:
- `Content-Security-Policy` (CSP) — detectar `unsafe-inline`, `unsafe-eval`, wildcards `*`
- `X-Frame-Options: DENY` ou `SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` ou mais restritivo
- `Permissions-Policy` — checar se câmera/microfone/geolocation estão restritos
- `Strict-Transport-Security` (HSTS) com `max-age` adequado
- Ausência de `X-Powered-By: Next.js` (deve ser removido)

#### 5. API Routes / Route Handlers — Exposição de Dados
- Detectar retornos que expõem objetos completos do banco (ex: retornar todo o objeto `user` com campos como `password`, `hash`, `salt`, `internalId`, `stripeCustomerId`)
- Verificar se há seleção explícita de campos (`select: { name: true, email: true }` no Prisma, projeção no Mongoose, etc.)
- Detectar stack traces ou mensagens de erro detalhadas chegando ao cliente em produção
- Checar se erros são normalizados antes de retornar: `{ error: "Internal server error" }` vs `{ error: err.message, stack: err.stack }`

#### 6. Autenticação e Autorização em API Routes
- Detectar API Routes sem verificação de autenticação
- Checar se rotas protegidas validam o token/sessão antes de processar
- Verificar padrões: `getServerSession()`, `auth()` do NextAuth v5, verificação de JWT
- Detectar IDOR (Insecure Direct Object Reference): queries que usam IDs direto do request sem checar se pertencem ao usuário autenticado
- Exemplo de IDOR: `db.post.findUnique({ where: { id: req.query.id } })` sem `userId: session.user.id`

#### 7. Server Actions — Segurança
- Verificar se Server Actions têm validação de autenticação (`auth()` ou `getServerSession()`)
- Checar se inputs são validados/sanitizados (Zod, Yup, Valibot) antes de persistir
- Detectar Server Actions que executam operações destrutivas sem verificar ownership
- Verificar se `"use server"` não está sendo exportado de arquivos que também exportam dados sensíveis

#### 8. Middleware — Proteção de Rotas
- Verificar se o `middleware.ts` protege rotas autenticadas
- Checar se o `matcher` está configurado corretamente (não proteger assets públicos, proteger `/dashboard`, `/api/protected`, etc.)
- Detectar redirects inseguros baseados em input do usuário (open redirect)

#### 9. Dependências com Vulnerabilidades Conhecidas
- Orientar a rodar `npm audit` / `pnpm audit` / `yarn audit`
- Checar versões de pacotes críticos: `next`, `next-auth`, `jose`, `jsonwebtoken`
- Alertar sobre pacotes deprecados ou abandonados que lidam com auth/crypto

#### 10. Exposição via `next.config.js`
- Verificar `rewrites` e `redirects` que possam causar SSRF (Server-Side Request Forgery)
- Checar se `images.domains` ou `images.remotePatterns` não está com wildcard `*`
- Verificar se `serverRuntimeConfig` (server-only) não está sendo misturado com `publicRuntimeConfig`
- Detectar uso de `dangerouslyAllowSVG: true` em `images` sem `contentDispositionType: 'attachment'`

#### 11. Renderização e Vazamento de Dados no HTML
- Verificar se `getServerSideProps` / `getStaticProps` não retorna campos sensíveis no `props` (que ficam visíveis no `__NEXT_DATA__` no HTML)
- Checar `JSON.stringify` de objetos completos sendo passados para o cliente
- Detectar dados sensíveis em `initialData` de React Query / SWR quando configurado no servidor

#### 12. CORS em API Routes
- Detectar `Access-Control-Allow-Origin: *` em rotas que retornam dados autenticados
- Verificar se CORS está configurado com allowlist explícita de origens
- Checar se credenciais (`credentials: 'include'`) são usadas junto com `*`

---

### Outputs esperados da skill

Quando o usuário pede uma auditoria de um projeto, a skill deve:

1. **Listar arquivos a inspecionar** e lê-los sistematicamente
2. **Gerar um relatório** estruturado com:
   - ✅ Itens OK
   - ⚠️ Avisos (risco médio, melhorar)
   - 🚨 Crítico (corrigir imediatamente)
3. **Para cada problema encontrado**: mostrar o trecho de código problemático + código corrigido
4. **Priorizar** por severidade: Crítico → Alto → Médio → Baixo
5. **Gerar um checklist** que o dev pode usar como PR checklist ou CI gate

### Quando a skill deve ser ativada

Ativar sempre que o usuário mencionar:
- "auditar segurança", "security audit", "revisar segurança"
- "NEXT_PUBLIC", "variáveis de ambiente", "env secrets"
- "source maps", "sourcemaps", "expondo código"
- "cookies HttpOnly", "cookies seguros"
- "headers de segurança", "CSP", "Content-Security-Policy"
- "API Route segura", "proteger rota", "autenticação middleware"
- "vazando dados", "expondo dados", "dados sensíveis no frontend"
- "Server Action segura", "validar Server Action"
- Qualquer menção a "segurança" + "Next.js"

### Estrutura de arquivos da skill

Crie a skill com esta estrutura:
```
nextjs-security-audit/
├── SKILL.md                          # Instruções principais
└── references/
    ├── checklist.md                  # Checklist completo para PR/CI
    ├── fixes.md                      # Snippets de código para correções comuns
    └── config-examples.md            # Exemplos de next.config.js seguro, middleware.ts, etc.
```

### Exemplo de caso de teste para validar a skill

Teste 1 — Detecção de NEXT_PUBLIC vazando segredo:
```
.env.local:
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_DATABASE_URL=postgresql://user:pass@host/db
```
Esperado: 🚨 Crítico em ambas as variáveis, com explicação e correção.

Teste 2 — Cookie sem HttpOnly:
```js
res.setHeader('Set-Cookie', `session=${token}; Path=/; Max-Age=86400`)
```
Esperado: 🚨 Crítico — faltam HttpOnly, Secure, SameSite.

Teste 3 — Source maps em produção:
```js
// next.config.js
productionBrowserSourceMaps: true
```
Esperado: ⚠️ Aviso alto — expõe código-fonte.

Teste 4 — API Route sem auth:
```js
// app/api/user/route.ts
export async function GET(req) {
  const users = await db.user.findMany()
  return Response.json(users)
}
```
Esperado: 🚨 Crítico — sem autenticação + retornando todos os campos dos usuários.

---

Por favor, crie a skill completa seguindo o processo do skill-creator: escreva o SKILL.md e os arquivos de referência, depois teste com os casos acima e me mostre os resultados para eu avaliar.