"use server";

import { createClient } from "@/lib/supabase/server";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { publicError } from "@/lib/security/security-errors";
import { cookies } from "next/headers";
import { z } from "zod";

const codeSchema = z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos.");

/** Inicia o enrollment TOTP — retorna QR code e secret para o usuário escanear */
export async function startMfaEnrollment() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType:   "totp",
    issuer:       "CRM Vendas",
    friendlyName: "CRM Vendas WhatsApp",
  });

  if (error) return publicError(error, "Erro ao iniciar configuração de 2FA.");

  return {
    factorId: data.id,
    qrCode:   data.totp.qr_code, // SVG base64 pronto para <img src>
    secret:   data.totp.secret,  // para entrada manual
  };
}

/** Verifica o código e ativa o fator TOTP */
export async function activateMfa(_: unknown, formData: FormData) {
  const factorId = formData.get("factorId") as string;
  const code     = (formData.get("code") as string)?.replace(/\s/g, "");

  if (!factorId) return { error: "Fator inválido." };

  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { error: "Código deve ter 6 dígitos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return publicError(challengeError, "Erro ao criar desafio.");

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code:        parsed.data,
  });

  if (verifyError) return { error: "Código incorreto. Tente novamente." };

  await createAuditLog({
    action:    AUDIT_ACTIONS.TWO_FACTOR_ENABLED,
    user_id:   user.id,
    entity_type: "profile",
    entity_id:   user.id,
    ip_address:  await getClientIp(),
  });

  // Limpa o cookie de setup obrigatório se existir
  const cookieStore = await cookies();
  cookieStore.delete("require-mfa-setup");

  return { success: true };
}

/** Remove o fator TOTP */
export async function disableMfa(factorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return publicError(error, "Erro ao remover 2FA.");

  await createAuditLog({
    action:    AUDIT_ACTIONS.TWO_FACTOR_DISABLED,
    user_id:   user.id,
    entity_type: "profile",
    entity_id:   user.id,
    ip_address:  await getClientIp(),
  });

  return { success: true };
}

/** Retorna os fatores TOTP ativos do usuário */
export async function getMfaFactors() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { factors: [] };

  const { data } = await supabase.auth.mfa.listFactors();
  return { factors: data?.totp ?? [] };
}
