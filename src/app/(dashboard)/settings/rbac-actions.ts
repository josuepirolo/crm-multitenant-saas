"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/guards";
import { SupabaseRbacRepository } from "@/repositories/rbac.repository";
import {
  ListPermissionsUseCase,
  ListWorkspaceRolesUseCase,
  CreateWorkspaceRoleUseCase,
  DeleteWorkspaceRoleUseCase,
  SetRolePermissionsUseCase,
  AssignRoleToMemberUseCase,
} from "@/usecases/RbacUseCases";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp, getUserAgent } from "@/lib/security/client-ip";
import { revalidatePath } from "next/cache";
import { publicError } from "@/lib/security/security-errors";

function makeRepo(client: Awaited<ReturnType<typeof createClient>>) {
  return new SupabaseRbacRepository(client);
}

export async function listPermissions() {
  const ctx = await getWorkspaceContext("members", "view");
  if ("error" in ctx) return { error: ctx.error, data: [] };
  const supabase = await createClient();
  try {
    const data = await new ListPermissionsUseCase(makeRepo(supabase)).execute();
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar permissões.", data: [] };
  }
}

export async function listWorkspaceRoles() {
  const ctx = await getWorkspaceContext("members", "view");
  if ("error" in ctx) return { error: ctx.error, data: [] };
  const supabase = await createClient();
  try {
    const data = await new ListWorkspaceRolesUseCase(makeRepo(supabase)).execute(ctx.workspaceId);
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar perfis.", data: [] };
  }
}

export async function createWorkspaceRole(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("members", "create");
  if ("error" in ctx) return { error: ctx.error };
  const name = formData.get("name") as string;
  const supabase = await createClient();
  try {
    const role = await new CreateWorkspaceRoleUseCase(makeRepo(supabase)).execute(ctx.workspaceId, name);
    await createAuditLog({
      action:       AUDIT_ACTIONS.ROLE_CREATED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_role",
      entity_id:    role.id,
      ip_address:   await getClientIp(),
      user_agent:   await getUserAgent(),
      metadata:     { name },
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao criar perfil.");
  }
}

export async function deleteWorkspaceRole(roleId: string) {
  const ctx = await getWorkspaceContext("members", "delete");
  if ("error" in ctx) return { error: ctx.error };
  const supabase = await createClient();
  try {
    await new DeleteWorkspaceRoleUseCase(makeRepo(supabase)).execute(roleId);
    await createAuditLog({
      action:       AUDIT_ACTIONS.ROLE_DELETED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_role",
      entity_id:    roleId,
      ip_address:   await getClientIp(),
      user_agent:   await getUserAgent(),
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao remover perfil.");
  }
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const ctx = await getWorkspaceContext("members", "edit");
  if ("error" in ctx) return { error: ctx.error };
  const supabase = await createClient();
  try {
    await new SetRolePermissionsUseCase(makeRepo(supabase)).execute(roleId, permissionIds);
    await createAuditLog({
      action:       AUDIT_ACTIONS.ROLE_PERMISSIONS_SET,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_role",
      entity_id:    roleId,
      ip_address:   await getClientIp(),
      user_agent:   await getUserAgent(),
      metadata:     { count: permissionIds.length },
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar permissões.");
  }
}

export async function assignRoleToMember(memberId: string, roleId: string) {
  const ctx = await getWorkspaceContext("members", "edit");
  if ("error" in ctx) return { error: ctx.error };
  const supabase = await createClient();
  try {
    await new AssignRoleToMemberUseCase(makeRepo(supabase)).execute(memberId, roleId);
    await createAuditLog({
      action:       AUDIT_ACTIONS.MEMBER_RBAC_ASSIGNED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_member",
      entity_id:    memberId,
      ip_address:   await getClientIp(),
      user_agent:   await getUserAgent(),
      metadata:     { role_id: roleId },
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atribuir perfil.");
  }
}
