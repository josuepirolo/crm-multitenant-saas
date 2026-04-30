import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const pathname = request.nextUrl.pathname;
  const isUpdatePassword = pathname.startsWith("/update-password");
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
    return NextResponse.redirect(url);
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

    // Já passou pelo 2FA → sai do /mfa
    if (!mfaRequired && isMfaRoute) {
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
