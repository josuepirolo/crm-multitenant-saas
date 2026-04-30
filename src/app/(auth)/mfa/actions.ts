"use server";

import { createClient } from "@/lib/supabase/server";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { redirect } from "next/navigation";
import { z } from "zod";

const codeSchema = z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos.");

export async function verifyMfaLogin(_: unknown, formData: FormData) {
  const raw  = formData.get("code") as string;
  const code = raw?.replace(/\s/g, "");

  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { error: "Código inválido. Digite os 6 dígitos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError || !factors?.totp?.length) {
    return { error: "Nenhum fator 2FA encontrado. Contate o suporte." };
  }

  const factor = factors.totp[0];

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) return { error: "Erro ao iniciar verificação 2FA." };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId:    factor.id,
    challengeId: challenge.id,
    code:        parsed.data,
  });

  if (verifyError) return { error: "Código incorreto. Tente novamente." };

  await createAuditLog({
    action:    AUDIT_ACTIONS.LOGIN_SUCCESS,
    user_id:   user.id,
    ip_address: await getClientIp(),
    metadata:  { mfa: true },
  });

  redirect("/dashboard");
}
