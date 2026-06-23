# Supabase Auth — SSR (@supabase/ssr)

## Setup

Pacotes: `@supabase/supabase-js`, `@supabase/ssr`

## Três clients

| Client | Onde | Cookie |
|---|---|---|
| `createBrowserClient` | `"use client"` | document |
| `createServerClient` | RSC, Server Actions | cookies() next/headers |
| Middleware client | `middleware.ts` | request/response chain |

## Middleware pattern

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  // guards de rota...
  return response;
}
```

## getUser vs getSession

Preferir **`getUser()`** no servidor — revalida JWT com Supabase.

## Custom JWT claims

Se precisar claims `authz` no token: Custom Access Token Hook (Postgres function) — ver decisão em `auth/decision-supabase-vs-custom-jwt.md`.
