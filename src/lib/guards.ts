"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { getUserRole } from "@/lib/user-role";
import { getValidatedImpersonatedWorkspaceId } from "@/lib/impersonation";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  const { data: { user } } = await getCachedUser();
  if (!user) return null;

  const impersonatedId = await getValidatedImpersonatedWorkspaceId(user.id);
  if (impersonatedId) return impersonatedId;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("current_workspace_id")
    .eq("id", user.id)
    .single();

  return data?.current_workspace_id ?? null;
}

/**
 * Cliente Supabase para operações de dados do workspace resolvido por
 * getWorkspaceContext/getCurrentWorkspaceId. Durante impersonação validada
 * (getValidatedImpersonatedWorkspaceId), o auth.uid() real (superadmin) não
 * é necessariamente membro do workspace impersonado — RLS bloquearia leituras
 * e escritas mesmo com workspaceId corretamente resolvido. A validação de
 * impersonação (cookie + is_superadmin confirmado no banco) já é o gate de
 * segurança (acesso owner-like, ver ADR-004), então usamos service_role aqui.
 * Sem impersonação, comportamento idêntico ao createClient() RLS-bound.
 */
export async function getScopedSupabaseClient(): Promise<SupabaseClient> {
  const { data: { user } } = await getCachedUser();
  if (user) {
    const impersonatedId = await getValidatedImpersonatedWorkspaceId(user.id);
    if (impersonatedId) return createAdminClient();
  }
  return createClient();
}

export async function requireSuperAdmin(): Promise<{ userId: string } | null> {
  const { data: { user } } = await getCachedUser();
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
  const { data: { user } } = await getCachedUser();
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
  const { data: { user } } = await getCachedUser();
  if (!user) return { error: "Não autenticado." };

  // Superadmin impersonando outro workspace: acesso total (owner-like) ao
  // workspace impersonado. startImpersonation já exige requireSuperAdmin()
  // e é auditado — bypassa current_workspace_id e RBAC normais.
  const impersonatedId = await getValidatedImpersonatedWorkspaceId(user.id);
  if (impersonatedId) return { workspaceId: impersonatedId, userId: user.id };

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

  const members = profile?.workspace_members as unknown as MemberRow[] | null;
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
