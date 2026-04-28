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

/**
 * Resolve contexto de workspace + verifica permissão efetiva.
 * Se o membro tiver workspace_role_id definido → usa RBAC granular (banco).
 * Caso contrário → fallback para matriz hardcoded (permissions.ts).
 * Nunca confia em permissão vinda do cliente.
 */
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
    .select(`
      current_workspace_id,
      workspace_members (
        id, role, workspace_id, deleted_at, workspace_role_id,
        workspace_roles (
          workspace_role_permissions (
            permissions ( key )
          )
        )
      )
    `)
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.current_workspace_id as string | null;
  if (!workspaceId) return { error: "Workspace não encontrado." };

  type PermRow = { permissions: { key: string } };
  type RoleRow = { workspace_role_permissions: PermRow[] };
  type MemberRow = {
    id: string;
    role: string;
    workspace_id: string;
    deleted_at: string | null;
    workspace_role_id: string | null;
    workspace_roles: RoleRow | null;
  };

  const members = profile?.workspace_members as MemberRow[] | null;
  const member = members?.find(
    (m) => m.workspace_id === workspaceId && m.deleted_at === null
  );

  if (!member) return { error: "Você não tem permissão para realizar esta ação." };

  let allowed: boolean;

  if (member.workspace_role_id && member.workspace_roles) {
    // RBAC granular: verifica permissão no banco
    const permKeys = (member.workspace_roles.workspace_role_permissions ?? [])
      .map((wrp) => wrp.permissions?.key)
      .filter(Boolean) as string[];
    allowed = permKeys.includes(`${module}:${action}`);
  } else {
    // Fallback: matriz hardcoded
    allowed = can((member.role as MemberRole) ?? null, module, action);
  }

  if (!allowed) return { error: "Você não tem permissão para realizar esta ação." };

  return { workspaceId, userId: user.id };
}
