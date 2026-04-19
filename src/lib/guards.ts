"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import type { MemberRole, PermissionModule, PermissionAction } from "@/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(workspaceId: string): Promise<MemberRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Admin client bypasses RLS — server-side permission check only
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

export async function requirePermission(
  workspaceId: string,
  module: PermissionModule,
  action: PermissionAction
): Promise<{ error: string } | null> {
  const role = await getUserRole(workspaceId);
  if (!can(role, module, action)) {
    return { error: "Você não tem permissão para realizar esta ação." };
  }
  return null;
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("current_workspace_id")
    .eq("id", user.id)
    .single();

  return data?.current_workspace_id ?? null;
}
