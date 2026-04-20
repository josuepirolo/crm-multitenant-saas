"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";
import { SupabaseAdminRepository } from "@/repositories/admin.repository";
import { GetAdminStatsUseCase, ListAllWorkspacesUseCase, GetWorkspaceMembersAdminUseCase } from "@/usecases/AdminUseCases";

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

export async function listAllWorkspaces(search: string, page: number, pageSize: number) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", data: [], total: 0 };

  try {
    const result = await new ListAllWorkspacesUseCase(makeRepo()).execute(search, page, pageSize);
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
