# Exemplos de Configuração Segura — Next.js

## next.config.ts — configuração base segura

```ts
import type { NextConfig } from 'next'

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  },
  {
    // Adapte as fontes ao que o projeto realmente usa
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}'",  // usar nonce gerado por request
      "style-src 'self' 'unsafe-inline'",   // unsafe-inline necessário para CSS-in-JS
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
]

const config: NextConfig = {
  poweredByHeader: false,        // Remove X-Powered-By: Next.js
  productionBrowserSourceMaps: false,  // Padrão, mas explícito para clareza

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',  // Específico, não wildcard
        pathname: '/storage/v1/object/public/**'
      }
    ],
    // dangerouslyAllowSVG: false (padrão — não ativar sem necessidade)
  },

  // Sem rewrites para URLs externas arbitrárias (evita SSRF)
}

export default config
```

## middleware.ts — proteção de rotas + headers por request

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers }
  })

  // Verificação de sessão Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Redirecionar para login se não autenticado
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirecionar para dashboard se já autenticado tentando acessar auth
  if (session && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register'
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
```

## Exemplo de .env correto

```bash
# .env.example — valores fictícios, commitar este arquivo

# ✅ Públicos — podem ter NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://app.exemplo.com

# 🔒 Privados — NUNCA usar NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:senha@db.xxxx.supabase.co:5432/postgres
STRIPE_SECRET_KEY=sk_live_...
NEXTAUTH_SECRET=gerar-com-openssl-rand-base64-32
WEBHOOK_SECRET=gerar-com-openssl-rand-base64-32
ALLOWED_ORIGINS=https://app.exemplo.com,https://admin.exemplo.com
```

## Projeção explícita de campos no Prisma

```ts
// ❌ Retorna tudo — inclui password, salt, internalIds, etc.
const user = await prisma.user.findUnique({ where: { id } })

// ✅ Apenas campos necessários
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true
    // password, salt, stripeCustomerId etc. ficam fora
  }
})
```

## Projeção no Supabase

```ts
// ❌ Retorna todas as colunas
const { data } = await supabase.from('users').select('*')

// ✅ Seleciona apenas o necessário
const { data } = await supabase
  .from('users')
  .select('id, name, email, role, created_at')
```
