"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidatedImpersonatedWorkspaceId } from "@/lib/impersonation";
import type { MemberRole } from "@/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(workspaceId: string): Promise<MemberRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Superadmin impersonando este workspace: trata como owner.
  const impersonatedId = await getValidatedImpersonatedWorkspaceId(user.id);
  if (impersonatedId === workspaceId) return "owner";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getUserRole] Erro ao buscar role:", error.message);
    return null;
  }

  return (data?.role as MemberRole) ?? null;
}
