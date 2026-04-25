import { createAdminClient } from "@/lib/supabase/admin";

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
 * Writes an audit log entry using service_role (append-only via RLS).
 * Errors are swallowed — audit must never block the main user flow.
 */
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const metadata = entry.metadata ? sanitizeMetadata(entry.metadata) : {};
    await admin.from("audit_logs").insert({ ...entry, metadata });
  } catch {
    console.error("[audit] failed to write:", entry.action);
  }
}
