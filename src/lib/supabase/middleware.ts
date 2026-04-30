import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_STARTED,
  SESSION_COOKIE_ACTIVITY,
  ADMIN_LIMITS,
  USER_LIMITS,
  sessionCookieOptions,
  checkSessionExpiry,
} from "@/lib/security/session-policy";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname         = request.nextUrl.pathname;
  const isUpdatePassword = pathname.startsWith("/update-password");
  const isMfaSetupRoute  = pathname === "/mfa/setup";
  const isMfaRoute       = pathname.startsWith("/mfa");

  // Detecta sessão de recovery via JWT (funciona tanto para PKCE quanto implicit/hash flow)
  if (user && !isUpdatePassword) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split(".")[1]));
        const isRecovery = Array.isArray(payload.amr) &&
          payload.amr.some((a: { method: string }) => a.method === "recovery");
        if (isRecovery) {
          const url = request.nextUrl.clone();
          url.pathname = "/update-password";
          return NextResponse.redirect(url);
        }
      } catch {
        // JWT malformado — ignora e segue fluxo normal
      }
    }
  }

  // Rotas públicas (acesso sem autenticação)
  const isPublicAuthRoute = pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/reset-password") ||
    isUpdatePassword ||
    pathname.startsWith("/auth/callback");

  if (!user && !isPublicAuthRoute && !isMfaRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";

    // Heurística: se o cookie session-started-at existe e ainda estaria dentro do prazo,
    // mas o Supabase retornou null (refresh token inválido), a sessão foi substituída
    // por um login em outro navegador/dispositivo.
    const startedAt  = request.cookies.get(SESSION_COOKIE_STARTED)?.value;
    const activityAt = request.cookies.get(SESSION_COOKIE_ACTIVITY)?.value;
    const notExpiredYet = startedAt && activityAt &&
      checkSessionExpiry(startedAt, activityAt, USER_LIMITS) === null;

    if (notExpiredYet) {
      url.searchParams.set("reason", "session_replaced");
    }

    const redirectRes = NextResponse.redirect(url);
    redirectRes.cookies.delete(SESSION_COOKIE_STARTED);
    redirectRes.cookies.delete(SESSION_COOKIE_ACTIVITY);
    return redirectRes;
  }

  // ── Verificação de expiração de sessão (apenas para usuários autenticados, rotas protegidas) ──
  if (user && !isPublicAuthRoute) {
    const startedAt  = request.cookies.get(SESSION_COOKIE_STARTED)?.value;
    const activityAt = request.cookies.get(SESSION_COOKIE_ACTIVITY)?.value;

    // Usa USER_LIMITS por padrão (mais conservador).
    // Admins têm ADMIN_LIMITS aplicados via cookie setado no signIn.
    const limits = USER_LIMITS;
    const expiredReason = checkSessionExpiry(startedAt, activityAt, limits);

    if (expiredReason) {
      // Encerra sessão no Supabase
      await supabase.auth.signOut({ scope: "local" });

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("reason", expiredReason === "inactivity" ? "session_expired" : "session_max");

      // Limpa cookies de sessão customizados na resposta
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete(SESSION_COOKIE_STARTED);
      redirectResponse.cookies.delete(SESSION_COOKIE_ACTIVITY);
      return redirectResponse;
    }

    // Sessão válida → atualiza timestamp de atividade
    if (startedAt) {
      const absMaxAge = parseInt(startedAt, 10) + limits.absoluteMs - Date.now();
      if (absMaxAge > 0) {
        supabaseResponse.cookies.set(SESSION_COOKIE_ACTIVITY, String(Date.now()), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: Math.ceil(absMaxAge / 1000),
        });
      }
    }
  }

  // MFA: verifica nível de autenticação quando usuário está logado
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const mfaRequired = aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";

    // Tem 2FA pendente → força /mfa (exceto se já está em rota de auth ou mfa)
    if (mfaRequired && !isMfaRoute && !isPublicAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa";
      return NextResponse.redirect(url);
    }

    // Já passou pelo 2FA → sai de /mfa (mas não de /mfa/setup — enrollments são válidos)
    if (!mfaRequired && isMfaRoute && !isMfaSetupRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Usuário já autenticado não precisa de login/register/reset — exceto update-password
  if (user && isPublicAuthRoute && !isUpdatePassword) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
