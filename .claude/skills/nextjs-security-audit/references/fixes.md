# Snippets de Correção — Segurança Next.js

## Cookie seguro (API Route / Pages Router)

```ts
// ❌ Inseguro
res.setHeader('Set-Cookie', `session=${token}; Path=/; Max-Age=86400`)

// ✅ Seguro
const isProd = process.env.NODE_ENV === 'production'
res.setHeader('Set-Cookie', [
  `session=${token}; Path=/; Max-Age=86400; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Lax`
])
```

## Cookie seguro (App Router / @supabase/ssr)

```ts
// ✅ @supabase/ssr já gerencia cookies com flags corretas via createServerClient
// Não criar cookies de sessão manualmente — deixar o Supabase gerenciar
```

## Autenticação em Route Handler

```ts
// ❌ Sem auth
export async function GET() {
  return Response.json(await db.user.findMany())
}

// ✅ Com auth
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await db.user.findMany({
    where: { workspaceId: session.user.workspaceId },
    select: { id: true, name: true, email: true, role: true }
  })

  return Response.json(users)
}
```

## Tratamento de erros sem vazar stack trace

```ts
// ❌ Vaza detalhes internos
catch (error) {
  return Response.json({ error: error.message, stack: error.stack }, { status: 500 })
}

// ✅ Normalizado
catch (error) {
  console.error('[API Error]', error)  // log apenas no servidor
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

## Prevenção de IDOR em Query

```ts
// ❌ IDOR — busca por ID sem verificar ownership
const post = await db.post.findUnique({
  where: { id: params.id }
})

// ✅ Filtro de ownership
const session = await auth()
const post = await db.post.findUnique({
  where: {
    id: params.id,
    userId: session.user.id  // garante que o recurso pertence ao usuário
  }
})
if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
```

## Server Action com auth + Zod

```ts
'use server'
import { z } from 'zod'
import { auth } from '@/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1)
})

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const parsed = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content')
  })
  if (!parsed.success) throw new Error('Invalid input')

  return db.post.create({
    data: {
      ...parsed.data,
      userId: session.user.id  // ownership derivado da sessão, nunca do input
    }
  })
}
```

## Middleware protegendo rotas

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth()

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/protected/:path*',
    // Excluir assets públicos:
    '/((?!_next/static|_next/image|favicon.ico|login|register|api/auth).*)'
  ]
}
```

## CORS com allowlist

```ts
// lib/cors.ts
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)

export function corsHeaders(requestOrigin: string | null) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin ?? '')
    ? requestOrigin
    : ALLOWED_ORIGINS[0] ?? ''

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  }
}
```

## XSS — sanitizar HTML de usuário

```tsx
// ❌ XSS direto
<div dangerouslySetInnerHTML={{ __html: post.content }} />

// ✅ Sanitizado (instalar: npm i dompurify @types/dompurify)
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />

// ✅ href seguro
const safeHref = /^https?:\/\//.test(url) ? url : '#'
<a href={safeHref} rel="noopener noreferrer">{label}</a>
```

## CSRF — verificar Origin em Route Handlers

```ts
// lib/csrf.ts
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

// uso em Route Handler
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}
```

## Upload — validação de magic bytes

```ts
// lib/upload-validation.ts
const ALLOWED: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
}
const MAX_BYTES = 5 * 1024 * 1024

export async function validateUpload(file: File) {
  if (file.size > MAX_BYTES) throw new Error('File too large')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['jpg','jpeg','png','webp','pdf'].includes(ext))
    throw new Error('Extension not allowed')

  const buf = new Uint8Array(await file.arrayBuffer())
  const magic = ALLOWED[file.type]
  if (!magic || !magic.every((b, i) => buf[i] === b))
    throw new Error('File content mismatch')

  // Sanitizar nome (remover path traversal)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return { buffer: buf, safeName, mimeType: file.type }
}
```

## SSRF — allowlist de domínios para fetch externo

```ts
// lib/safe-fetch.ts
const ALLOWED_HOSTS = (process.env.ALLOWED_FETCH_HOSTS ?? '').split(',').filter(Boolean)

export async function safeFetch(url: string, options?: RequestInit) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Host not allowed: ${parsed.hostname}`)
  }

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS allowed in production')
  }

  return fetch(parsed.toString(), options)
}
```

## Logs seguros — sem dados sensíveis

```ts
// lib/safe-log.ts
const SENSITIVE = ['password','passwordHash','salt','token','secret','key','authorization','hash']

export function safeLog(label: string, obj: Record<string, unknown>) {
  const sanitized = Object.fromEntries(
    Object.entries(obj).filter(([k]) =>
      !SENSITIVE.some(s => k.toLowerCase().includes(s))
    )
  )
  console.log(label, sanitized)
}

// Uso:
safeLog('Auth:', { userId: session.user.id, email: session.user.email })
// Nunca: console.log('Session:', session)
```

## Open Redirect seguro no Middleware

```ts
// ❌ Open redirect
const redirect = req.nextUrl.searchParams.get('redirect')
return NextResponse.redirect(redirect)

// ✅ Apenas caminhos internos
const redirect = req.nextUrl.searchParams.get('redirect')
const safePath = redirect?.startsWith('/') && !redirect.startsWith('//')
  ? redirect
  : '/dashboard'
return NextResponse.redirect(new URL(safePath, req.url))
```
