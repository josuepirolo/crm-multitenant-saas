"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";
import { setImpersonation, clearImpersonation, getImpersonationContext } from "@/lib/impersonation";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp, getUserAgent } from "@/lib/security/client-ip";

export async function startImpersonation(workspaceId: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return;

  // Busca nome da empresa para exibição no banner — service_role garante acesso global
  const admin = createAdminClient();
  const { data: ws } = await admin
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  if (!ws) return;

  await setImpersonation({
    workspaceId,
    workspaceName: ws.name,
    impersonatedBy: sa.userId,
  });

  await createAuditLog({
    action:    AUDIT_ACTIONS.IMPERSONATION_STARTED,
    user_id:   sa.userId,
    ip_address: await getClientIp(),
    user_agent: await getUserAgent(),
    metadata:  { target_workspace_id: workspaceId, workspace_name: ws.name },
  });

  redirect("/dashboard");
}

export async function stopImpersonation() {
  const sa = await requireSuperAdmin();
  if (!sa) return;

  const ctx = await getImpersonationContext();

  await clearImpersonation();

  if (ctx) {
    await createAuditLog({
      action:    AUDIT_ACTIONS.IMPERSONATION_ENDED,
      user_id:   sa.userId,
      ip_address: await getClientIp(),
      user_agent: await getUserAgent(),
      metadata:  { target_workspace_id: ctx.workspaceId, workspace_name: ctx.workspaceName },
    });
  }

  redirect("/admin");
}
