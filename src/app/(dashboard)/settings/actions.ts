"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { publicError } from "@/lib/security/security-errors";
import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";
import { UpdateWorkspaceUseCase } from "@/usecases/WorkspaceUseCases";
import { ListMembersUseCase, InviteMemberUseCase, UpdateMemberRoleUseCase, DeactivateMemberUseCase } from "@/usecases/MemberUseCases";
import { getWorkspaceContext } from "@/lib/guards";
import { updateWorkspaceSchema, inviteMemberSchema, updateMemberRoleSchema } from "@/lib/validations/workspace";
import { revalidatePath } from "next/cache";

export async function getSettingsData() {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error, workspace: null, members: [] };

  const supabase = await createClient();
  const [ws, members] = await Promise.all([
    new SupabaseWorkspaceRepository(supabase).findById(ctx.workspaceId),
    new ListMembersUseCase(new SupabaseWorkspaceMemberRepository(supabase)).execute(ctx.workspaceId),
  ]);

  return { error: undefined, workspace: ws, members, currentUserId: ctx.userId };
}

export async function updateWorkspace(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("settings", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = updateWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    const workspace = await new UpdateWorkspaceUseCase(new SupabaseWorkspaceRepository(supabase)).execute(ctx.workspaceId, parsed.data);
    await createAuditLog({
      action:       AUDIT_ACTIONS.WORKSPACE_UPDATED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace",
      entity_id:    ctx.workspaceId,
      ip_address:   await getClientIp(),
    });
    revalidatePath("/settings");
    return { error: undefined, workspace };
  } catch (err) {
    return publicError(err, "Erro ao atualizar workspace.");
  }
}

export async function inviteMember(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("members", "create");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role:  formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // get_user_id_by_email acessa auth.users — GRANT apenas para service_role, admin obrigatório aqui
  const admin = createAdminClient();
  const { data: userId, error: lookupError } = await admin.rpc("get_user_id_by_email", {
    lookup_email: parsed.data.email,
  });

  if (lookupError || !userId) {
    return { error: "Nenhuma conta encontrada com este e-mail. O usuário precisa criar uma conta primeiro." };
  }

  try {
    const supabase = await createClient();
    await new InviteMemberUseCase(new SupabaseWorkspaceMemberRepository(supabase)).execute({
      workspace_id: ctx.workspaceId,
      user_id: userId as string,
      role: parsed.data.role,
    });
    await createAuditLog({
      action:       AUDIT_ACTIONS.MEMBER_INVITED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_member",
      entity_id:    userId as string,
      ip_address:   await getClientIp(),
      metadata:     { role: parsed.data.role },
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao convidar membro.");
  }
}

export async function updateMemberRole(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("members", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = updateMemberRoleSchema.safeParse({
    userId: formData.get("userId"),
    role:   formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    await new UpdateMemberRoleUseCase(new SupabaseWorkspaceMemberRepository(supabase)).execute(
      ctx.workspaceId,
      parsed.data.userId,
      ctx.userId,
      parsed.data.role,
    );
    await createAuditLog({
      action:       AUDIT_ACTIONS.MEMBER_ROLE_UPDATED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_member",
      entity_id:    parsed.data.userId,
      ip_address:   await getClientIp(),
      metadata:     { role: parsed.data.role },
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar função.");
  }
}

export async function deactivateMember(formData: FormData) {
  const ctx = await getWorkspaceContext("members", "delete");
  if ("error" in ctx) return { error: ctx.error };

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "ID do membro inválido." };

  try {
    const supabase = await createClient();
    await new DeactivateMemberUseCase(new SupabaseWorkspaceMemberRepository(supabase)).execute(ctx.workspaceId, userId, ctx.userId);
    await createAuditLog({
      action:       AUDIT_ACTIONS.MEMBER_DEACTIVATED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace_member",
      entity_id:    userId,
      ip_address:   await getClientIp(),
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao desativar membro.");
  }
}
