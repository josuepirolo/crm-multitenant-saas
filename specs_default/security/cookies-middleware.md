# Cookies e middleware

## Middleware Supabase (@supabase/ssr)

Responsabilidades:

1. Refresh session (`getUser()`)
2. Propagar cookies com flags seguras
3. Redirect `/login` se rota protegida
4. Política de sessão (timeout inatividade) se aplicável

## Flags ao setar cookies

```ts
supabaseResponse.cookies.set(name, value, {
  ...options,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
```

## Matcher

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Excluir assets estáticos — performance.

## O middleware NÃO faz

- Substituir RBAC em Server Action
- Esconder bug de RLS
- Validar Zod

## Rotas públicas

Lista explícita no middleware:

- `/login`, `/register`, `/reset-password`
- `/api/webhooks/*` (com auth própria)

## Debug

Se redirect loop: verificar cookies bloqueados, domínio, `Secure` em HTTP local.

Ver `auth/session-cookies-policy.md`
