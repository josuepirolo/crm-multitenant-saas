import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import { cookies } from "next/headers";

// Cookie name: sem __Host- prefix em dev (HTTP localhost), com prefix em prod (HTTPS obrigatório)
export const AUDIT_SID_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-audit-sid"
  : "audit-sid";

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS:       "login_success",
  LOGIN_FAILURE:       "login_failure",
  RATE_LIMIT_TRIGGERED:"rate_limit_triggered",
  REGISTER_SUCCESS:    "register_success",
  WORKSPACE_UPDATED:   "workspace_updated",
  MEMBER_INVITED:      "member_invited",
  MEMBER_ROLE_UPDATED: "member_role_updated",
  MEMBER_DEACTIVATED:  "member_deactivated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditEntry {
  workspace_id?: string;
  user_id?:      string;
  action:        AuditAction;
  entity_type?:  string;
  entity_id?:    string;
  ip_address?:   string;
  user_agent?:   string;
  session_id?:   string;
  fingerprint?:  string;
  metadata?:     Record<string, unknown>;
}

// Keys whose values must never reach the audit log
const SENSITIVE_KEY = /password|token|secret|key|pwd|auth/i;

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(meta).filter(([k]) => !SENSITIVE_KEY.test(k))
  );
}

/**
 * Builds a non-reversible fingerprint for secondary correlation.
 * Uses anonymized IP (/24), user_agent and a secret salt.
 * Exported for testing.
 */
export function buildFingerprint(ip: string, userAgent: string): string {
  const salt = process.env.AUDIT_FINGERPRINT_SALT ?? "";
  const ipAnon = ip === "unknown"
    ? "unknown"
    : ip.split(".").slice(0, 3).join(".") + ".0"; // /24 — removes last octet
  return createHash("sha256")
    .update(`${ipAnon}:${userAgent}:${salt}`)
    .digest("hex")
    .slice(0, 24);
}

async function getSessionId(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(AUDIT_SID_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Writes an audit log entry using service_role (append-only via RLS).
 * Automatically populates session_id (from cookie) and fingerprint (from IP+UA+salt).
 * Errors are swallowed — audit must never block the main user flow.
 */
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const metadata = entry.metadata ? sanitizeMetadata(entry.metadata) : {};

    const session_id = entry.session_id ?? await getSessionId();

    let fingerprint = entry.fingerprint;
    if (!fingerprint && (entry.ip_address || entry.user_agent)) {
      fingerprint = buildFingerprint(
        entry.ip_address ?? "unknown",
        entry.user_agent ?? "unknown"
      );
    }

    await admin.from("audit_logs").insert({ ...entry, metadata, session_id, fingerprint });
  } catch {
    console.error("[audit] failed to write:", entry.action);
  }
}
