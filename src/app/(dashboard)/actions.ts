"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUDIT_SID_COOKIE } from "@/lib/audit/audit-log";
import { SESSION_COOKIE_STARTED, SESSION_COOKIE_ACTIVITY } from "@/lib/security/session-policy";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  const cookieStore = await cookies();
  cookieStore.delete(AUDIT_SID_COOKIE);
  cookieStore.delete(SESSION_COOKIE_STARTED);
  cookieStore.delete(SESSION_COOKIE_ACTIVITY);
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
