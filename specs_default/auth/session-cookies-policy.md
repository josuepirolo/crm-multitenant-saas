# Política de sessão e cookies

## Cookies de autenticação (Supabase SSR)

Configuração obrigatória ao setar cookies no middleware/server:

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
}
```

## Por quê cada flag

| Flag | Motivo |
|---|---|
| **HttpOnly** | JS no browser não lê token — mitiga XSS |
| **Secure** | Só HTTPS em produção |
| **SameSite=Lax** | Mitiga CSRF em POST cross-site; mantém OAuth redirects |
| **path=/** | Consistência entre rotas |

## Cookies de aplicação (não-auth)

| Cookie | HttpOnly | Uso |
|---|---|---|
| Sessão auth | ✅ | Supabase refresh |
| Preferência UI (tema) | opcional false | Pode ser localStorage versionado |
| Impersonation / audit sid | ✅ | Flags sensíveis sempre HttpOnly |

## Política de expiração

- Definir timeout de inatividade no **servidor** (middleware ou action)
- Client: `SessionTimer` apenas UX — **não** é fonte de verdade de segurança
- Logout: limpar **todos** cookies de sessão + flags derivados (impersonation, etc.)

## MFA / AAL

Se MFA habilitado:

- Operações sensíveis (alterar senha/email) podem exigir AAL2 no GoTrue
- Tratar erro real no servidor (`console.error`) — não mascarar como "link expirado"

## Checklist

- [ ] Nenhum access token em `localStorage`
- [ ] Refresh via cookie chain `@supabase/ssr`
- [ ] `signOut` limpa cookies derivados
- [ ] Middleware chama `getUser()` — não confiar só em cookie presence
