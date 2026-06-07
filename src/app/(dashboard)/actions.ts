"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUDIT_SID_COOKIE, createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { SESSION_COOKIE_STARTED, SESSION_COOKIE_ACTIVITY, SESSION_COOKIE_PROFILE } from "@/lib/security/session-policy";
import { getClientIp, getUserAgent } from "@/lib/security/client-ip";
import { getCachedUser } from "@/lib/supabase/cached-auth";

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await getCachedUser();

  // Registra logout antes de invalidar a sessão
  if (user) {
    const [ip, ua] = await Promise.all([getClientIp(), getUserAgent()]);
    await createAuditLog({
      action:     AUDIT_ACTIONS.SESSION_LOGOUT,
      user_id:    user.id,
      ip_address: ip,
      user_agent: ua,
    });
  }

  await supabase.auth.signOut({ scope: "global" });
  const cookieStore = await cookies();
  cookieStore.delete(AUDIT_SID_COOKIE);
  cookieStore.delete(SESSION_COOKIE_STARTED);
  cookieStore.delete(SESSION_COOKIE_ACTIVITY);
  cookieStore.delete(SESSION_COOKIE_PROFILE);
  redirect("/login");
}

export async function switchWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS via my_workspace_ids() garante que apenas workspaces ativos do usuário são acessíveis
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return; // workspace inativo ou sem acesso — não troca

  await supabase
    .from("profiles")
    .update({ current_workspace_id: workspaceId })
    .eq("id", user.id);

  redirect("/dashboard");
}
