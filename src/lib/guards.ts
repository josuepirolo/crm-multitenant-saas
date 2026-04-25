"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { getUserRole } from "@/lib/user-role";
import type { MemberRole, PermissionModule, PermissionAction } from "@/types";

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

export async function requireSuperAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  return data?.is_superadmin ? { userId: user.id } : null;
}

export async function requireOwner(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_owner")
    .eq("id", user.id)
    .single();

  return data?.is_owner ? { userId: user.id } : null;
}

// 2 round-trips: getUser + 1 query com join profiles→workspace_members
export async function getWorkspaceContext(
  module: PermissionModule,
  action: PermissionAction
): Promise<{ workspaceId: string; userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("current_workspace_id, workspace_members(role, workspace_id, deleted_at)")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.current_workspace_id as string | null;
  if (!workspaceId) return { error: "Workspace não encontrado." };

  type MemberRow = { role: string; workspace_id: string; deleted_at: string | null };
  const members = profile?.workspace_members as MemberRow[] | null;
  const member = members?.find(
    (m) => m.workspace_id === workspaceId && m.deleted_at === null
  );

  if (!can((member?.role as MemberRole) ?? null, module, action)) {
    return { error: "Você não tem permissão para realizar esta ação." };
  }

  return { workspaceId, userId: user.id };
}

