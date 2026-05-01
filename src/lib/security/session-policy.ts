/**
 * Política de expiração de sessão — baseada inteiramente em cookies HttpOnly
 * definidos pelo servidor. Nunca confia em timestamps vindos do cliente.
 *
 * Cookies:
 *  - session-started-at: timestamp de login (expiração absoluta)
 *  - session-activity-at: timestamp da última request autenticada (inatividade)
 *
 * Tempos (em ms):
 *  - Admin/owner:   15 min inatividade, 4h absoluto
 *  - Usuários comuns: 60 min inatividade, 12h absoluto
 */

export const SESSION_COOKIE_STARTED  = "session-started-at";
export const SESSION_COOKIE_ACTIVITY = "session-activity-at";

export interface SessionLimits {
  inactivityMs: number;
  absoluteMs:   number;
}

export const ADMIN_LIMITS: SessionLimits = {
  inactivityMs: 15 * 60 * 1000,   // 15 min
  absoluteMs:   4  * 60 * 60 * 1000, // 4h
};

export const USER_LIMITS: SessionLimits = {
  inactivityMs: 60 * 60 * 1000,   // 60 min
  absoluteMs:   12 * 60 * 60 * 1000, // 12h
};

export type ExpiredReason = "inactivity" | "absolute" | null;

export function checkSessionExpiry(
  startedAt: string | undefined,
  activityAt: string | undefined,
  limits: SessionLimits,
): ExpiredReason {
  const now = Date.now();

  if (!startedAt || !activityAt) return null; // cookie ausente → não verifica (sessão nova)

  const started  = parseInt(startedAt, 10);
  const activity = parseInt(activityAt, 10);

  if (isNaN(started) || isNaN(activity)) return null;

  if (now - activity > limits.inactivityMs) return "inactivity";
  if (now - started  > limits.absoluteMs)   return "absolute";

  return null;
}

export interface SessionExpiry {
  /** Epoch ms em que a sessão expira por inatividade (ou null se cookie ausente) */
  inactivityExpiresAt: number | null;
  /** Epoch ms em que a sessão expira absolutamente (ou null se cookie ausente) */
  absoluteExpiresAt:   number | null;
  /** O menor dos dois — expiração efetiva */
  effectiveExpiresAt:  number | null;
}

/** Calcula os timestamps de expiração a partir dos cookies (server-side only). */
export function computeSessionExpiry(
  startedAt: string | undefined,
  activityAt: string | undefined,
  limits: SessionLimits,
): SessionExpiry {
  if (!startedAt || !activityAt) {
    return { inactivityExpiresAt: null, absoluteExpiresAt: null, effectiveExpiresAt: null };
  }

  const started  = parseInt(startedAt, 10);
  const activity = parseInt(activityAt, 10);

  if (isNaN(started) || isNaN(activity)) {
    return { inactivityExpiresAt: null, absoluteExpiresAt: null, effectiveExpiresAt: null };
  }

  const inactivityExpiresAt = activity + limits.inactivityMs;
  const absoluteExpiresAt   = started  + limits.absoluteMs;
  const effectiveExpiresAt  = Math.min(inactivityExpiresAt, absoluteExpiresAt);

  return { inactivityExpiresAt, absoluteExpiresAt, effectiveExpiresAt };
}

/** Retorna opções base de cookie seguro para os cookies de sessão */
export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   Math.ceil(maxAgeMs / 1000),
  };
}
