"use server";

import { getWorkspaceContext } from "@/lib/guards";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { normalizePath, pathToArea } from "@/lib/analytics/normalize-path";
import { getClientIp, getUserAgent } from "@/lib/security/client-ip";

export async function recordAreaView(path: string): Promise<void> {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return;

  const normalizedPath = normalizePath(path);
  const area = pathToArea(path);

  const [ip, ua] = await Promise.all([getClientIp(), getUserAgent()]);

  await createAuditLog({
    action:       AUDIT_ACTIONS.AREA_VIEWED,
    workspace_id: ctx.workspaceId,
    user_id:      ctx.userId,
    ip_address:   ip,
    user_agent:   ua,
    metadata:     { area, path: normalizedPath },
  });
}
