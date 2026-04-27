"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, registerSchema, resetPasswordSchema, updatePasswordSchema } from "@/lib/validations/auth";
import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { uniqueSlug } from "@/lib/utils/slug";
import { redirect } from "next/navigation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/client-ip";
import { RATE_LIMIT_ERROR } from "@/lib/security/security-errors";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_SID_COOKIE } from "@/lib/audit/audit-log";
import { validateTurnstile } from "@/lib/security/turnstile";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function signIn(_: unknown, formData: FormData) {
  const captchaToken = formData.get("cf-turnstile-response") as string | null;
  if (!await validateTurnstile(captchaToken)) {
    return { error: "Verificação de segurança falhou. Tente novamente." };
  }

  const ip = await getClientIp();
  if (!await checkRateLimit(`login:ip:${ip}`, RATE_LIMITS.login)) {
    await createAuditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED, ip_address: ip, metadata: { context: "login" } });
    return { error: RATE_LIMIT_ERROR };
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (!await checkRateLimit(`login:email:${parsed.data.email}`, RATE_LIMITS.login)) {
    await createAuditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED, ip_address: ip, metadata: { context: "login" } });
    return { error: RATE_LIMIT_ERROR };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken: captchaToken ?? undefined },
  });

  if (error) {
    await createAuditLog({ action: AUDIT_ACTIONS.LOGIN_FAILURE, ip_address: ip });
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.", email: parsed.data.email };
    }
    return { error: "E-mail ou senha inválidos", email: parsed.data.email };
  }

  // Gera session_id opaco para correlação de auditoria — não contém dados do usuário
  const sessionId = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(AUDIT_SID_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await createAuditLog({
    action:     AUDIT_ACTIONS.LOGIN_SUCCESS,
    user_id:    authData.user?.id,
    ip_address: ip,
    user_agent: await getUserAgent(),
    session_id: sessionId,
  });
  redirect("/dashboard");
}

export async function signUp(_: unknown, formData: FormData) {
  const captchaToken = formData.get("cf-turnstile-response") as string | null;
  if (!await validateTurnstile(captchaToken)) {
    return { error: "Verificação de segurança falhou. Tente novamente." };
  }

  const ip = await getClientIp();
  if (!await checkRateLimit(`register:ip:${ip}`, RATE_LIMITS.register)) {
    await createAuditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED, ip_address: ip, metadata: { context: "register" } });
    return { error: RATE_LIMIT_ERROR };
  }

  const raw = {
    name: formData.get("name") as string,
    workspaceName: formData.get("workspaceName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      captchaToken: captchaToken ?? undefined,
    },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already registered")) {
      return { error: "Este e-mail já está cadastrado.", email: parsed.data.email, name: parsed.data.name, workspaceName: parsed.data.workspaceName };
    }
    return { error: authError.message, email: parsed.data.email, name: parsed.data.name, workspaceName: parsed.data.workspaceName };
  }

  if (!authData.user) {
    return { error: "Erro ao criar usuário. Tente novamente." };
  }

  const needsConfirmation = !authData.session;

  try {
    const admin = createAdminClient();
    const workspaceRepo = new SupabaseWorkspaceRepository(admin);

    await workspaceRepo.create({
      name: parsed.data.workspaceName,
      slug: uniqueSlug(parsed.data.workspaceName),
      owner_id: authData.user.id,
    });
  } catch (err) {
    console.error("[signUp] Erro ao criar workspace:", err);
    return { error: "Conta criada, mas houve um erro ao configurar seu workspace. Entre em contato com o suporte." };
  }

  await createAuditLog({
    action:   AUDIT_ACTIONS.REGISTER_SUCCESS,
    user_id:  authData.user.id,
    ip_address: ip,
    metadata: { workspace: parsed.data.workspaceName },
  });

  if (needsConfirmation) {
    redirect("/login?confirm=1");
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(_: unknown, formData: FormData) {
  const captchaToken = formData.get("cf-turnstile-response") as string | null;
  if (!await validateTurnstile(captchaToken)) {
    return { error: "Verificação de segurança falhou. Tente novamente." };
  }

  const ip = await getClientIp();
  if (!await checkRateLimit(`forgot:ip:${ip}`, RATE_LIMITS.forgotPassword)) {
    await createAuditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED, ip_address: ip, metadata: { context: "forgot_password" } });
    return { error: RATE_LIMIT_ERROR };
  }

  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!await checkRateLimit(`forgot:email:${parsed.data.email}`, RATE_LIMITS.forgotPassword)) {
    await createAuditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED, ip_address: ip, metadata: { context: "forgot_password" } });
    return { error: RATE_LIMIT_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
    captchaToken: captchaToken ?? undefined,
  });

  if (error) return { error: "Não foi possível enviar o e-mail. Tente novamente.", email: parsed.data.email };

  return { success: true };
}

export async function updatePassword(_: unknown, formData: FormData) {
  const ip = await getClientIp();
  if (!await checkRateLimit(`updatepwd:ip:${ip}`, RATE_LIMITS.updatePassword)) {
    await createAuditLog({ action: AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED, ip_address: ip, metadata: { context: "update_password" } });
    return { error: RATE_LIMIT_ERROR };
  }

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { error: "Não foi possível atualizar a senha. O link pode ter expirado." };

  // Encerra a sessão de recovery — o AMR "recovery" persiste no JWT após updateUser,
  // causando redirect em loop. signOut limpa o cookie antes do redirect para login.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?reset=1");
}
