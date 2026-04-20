"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";
import { UpdateWorkspaceUseCase } from "@/usecases/WorkspaceUseCases";
import { ListMembersUseCase, InviteMemberUseCase, UpdateMemberRoleUseCase, DeactivateMemberUseCase } from "@/usecases/MemberUseCases";
import { getWorkspaceContext, requireSuperAdmin } from "@/lib/guards";
import { updateWorkspaceSchema, inviteMemberSchema, updateMemberRoleSchema } from "@/lib/validations/workspace";
import { revalidatePath } from "next/cache";

function makeRepos() {
  const admin = createAdminClient();
  return {
    workspace: new SupabaseWorkspaceRepository(admin),
    member:    new SupabaseWorkspaceMemberRepository(admin),
    admin,
  };
}

export async function getSettingsData() {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error, workspace: null, members: [] };

  const { workspace, member } = makeRepos();
  const [ws, members] = await Promise.all([
    new SupabaseWorkspaceRepository(createAdminClient()).findById(ctx.workspaceId),
    new ListMembersUseCase(member).execute(ctx.workspaceId),
  ]);

  return { error: undefined, workspace: ws, members, currentUserId: ctx.userId };
}

export async function updateWorkspace(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("settings", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = updateWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const workspace = await new UpdateWorkspaceUseCase(makeRepos().workspace).execute(ctx.workspaceId, parsed.data);
    revalidatePath("/settings");
    return { error: undefined, workspace };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar workspace." };
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

  const { admin, member } = makeRepos();

  // Lookup user by email via DB function
  const { data: userId, error: lookupError } = await admin.rpc("get_user_id_by_email", {
    lookup_email: parsed.data.email,
  });

  if (lookupError || !userId) {
    return { error: "Nenhuma conta encontrada com este e-mail. O usuário precisa criar uma conta primeiro." };
  }

  try {
    await new InviteMemberUseCase(member).execute({
      workspace_id: ctx.workspaceId,
      user_id: userId as string,
      role: parsed.data.role,
    });
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao convidar membro." };
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
    await new UpdateMemberRoleUseCase(makeRepos().member).execute(
      ctx.workspaceId,
      parsed.data.userId,
      ctx.userId,
      parsed.data.role,
    );
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar função." };
  }
}

export async function deactivateMember(formData: FormData) {
  const ctx = await getWorkspaceContext("members", "delete");
  if ("error" in ctx) return { error: ctx.error };

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "ID do membro inválido." };

  try {
    await new DeactivateMemberUseCase(makeRepos().member).execute(ctx.workspaceId, userId, ctx.userId);
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao desativar membro." };
  }
}
