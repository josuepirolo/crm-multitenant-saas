"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_STARTED, SESSION_COOKIE_ACTIVITY, SESSION_COOKIE_PROFILE,
  resolveSessionLimits, sessionCookieOptions, computeSessionExpiry, checkSessionExpiry,
} from "@/lib/security/session-policy";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";

export interface RefreshResult {
  ok: boolean;
  /** Novo epoch ms de expiração por inatividade (recalculado após reset) */
  newInactivityExpiresAt?: number;
  /** Epoch ms da expiração absoluta (imutável) */
  absoluteExpiresAt?: number;
  error?: string;
}

/**
 * Renova a sessão por inatividade — reseta session-activity-at.
 * Nunca estende além do limite absoluto.
 * Nunca confia em qualquer dado vindo do cliente.
 */
export async function refreshSession(): Promise<RefreshResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessão inválida." };

  const store      = await cookies();
  const startedAt  = store.get(SESSION_COOKIE_STARTED)?.value;
  const activityAt = store.get(SESSION_COOKIE_ACTIVITY)?.value;
  const limits     = resolveSessionLimits(store.get(SESSION_COOKIE_PROFILE)?.value);

  // Verifica se a sessão ainda está válida antes de renovar
  const expired = checkSessionExpiry(startedAt, activityAt, limits);
  if (expired) return { ok: false, error: "Sessão já expirada." };

  const expiry = computeSessionExpiry(startedAt, activityAt, limits);
  if (!expiry.absoluteExpiresAt) return { ok: false, error: "Dados de sessão ausentes." };

  const now              = Date.now();
  const absoluteRemainsMs = expiry.absoluteExpiresAt - now;

  // Não renova se restar menos de 1 minuto até o limite absoluto
  if (absoluteRemainsMs < 60_000) {
    return { ok: false, error: "Sessão próxima do limite absoluto. Faça login novamente." };
  }

  // Novo expiry por inatividade — limitado pelo absoluto
  const newInactivityWindowMs = Math.min(limits.inactivityMs, absoluteRemainsMs);
  const newInactivityExpiresAt = now + newInactivityWindowMs;

  store.set(SESSION_COOKIE_ACTIVITY, String(now), sessionCookieOptions(absoluteRemainsMs));

  await createAuditLog({
    action:    AUDIT_ACTIONS.SESSION_REFRESHED,
    user_id:   user.id,
    ip_address: await getClientIp(),
    metadata:  { remaining_absolute_ms: Math.round(absoluteRemainsMs / 1000) },
  });

  return { ok: true, newInactivityExpiresAt, absoluteExpiresAt: expiry.absoluteExpiresAt };
}
