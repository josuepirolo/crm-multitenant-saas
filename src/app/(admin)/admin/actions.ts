"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";
import { SupabaseAdminRepository } from "@/repositories/admin.repository";
import { GetAdminStatsUseCase, ListAllWorkspacesUseCase, GetWorkspaceMembersAdminUseCase, UpdateWorkspaceAdminUseCase, SetWorkspaceActiveUseCase, ChangeMemberRoleAdminUseCase } from "@/usecases/AdminUseCases";
import type { MemberRole } from "@/types";

function makeRepo() {
  return new SupabaseAdminRepository(createAdminClient());
}

export async function getAdminStats() {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };

  try {
    const stats = await new GetAdminStatsUseCase(makeRepo()).execute();
    return { error: undefined, stats };
  } catch {
    return { error: "Erro ao buscar estatísticas." };
  }
}

export async function listAllWorkspaces(search: string, page: number, pageSize: number, isActive?: boolean) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", data: [], total: 0 };

  try {
    const result = await new ListAllWorkspacesUseCase(makeRepo()).execute(search, page, pageSize, isActive);
    return { error: undefined, ...result };
  } catch {
    return { error: "Erro ao buscar workspaces.", data: [], total: 0 };
  }
}

export async function getWorkspaceMembersAdmin(workspaceId: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", members: [] };

  try {
    const members = await new GetWorkspaceMembersAdminUseCase(makeRepo()).execute(workspaceId);
    return { error: undefined, members };
  } catch {
    return { error: "Erro ao buscar membros.", members: [] };
  }
}

export async function updateWorkspaceAdmin(workspaceId: string, name: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    await new UpdateWorkspaceAdminUseCase(makeRepo()).execute(workspaceId, name);
    return { error: undefined };
  } catch {
    return { error: "Erro ao atualizar workspace." };
  }
}

export async function setWorkspaceActiveAdmin(workspaceId: string, active: boolean) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    await new SetWorkspaceActiveUseCase(makeRepo()).execute(workspaceId, active);
    return { error: undefined };
  } catch {
    return { error: "Erro ao atualizar status." };
  }
}

export async function changeMemberRoleAdmin(memberId: string, role: MemberRole) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    await new ChangeMemberRoleAdminUseCase(makeRepo()).execute(memberId, role);
    return { error: undefined };
  } catch {
    return { error: "Erro ao alterar role." };
  }
}
