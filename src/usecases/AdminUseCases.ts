import type { IAdminRepository } from "@/repositories/admin.repository";
import type { AdminGlobalStats, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";

export class GetAdminStatsUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(): Promise<AdminGlobalStats> {
    return this.repo.getStats();
  }
}

export class ListAllWorkspacesUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(search: string, page: number, pageSize: number): Promise<{ data: WorkspaceWithStats[]; total: number }> {
    return this.repo.listWorkspaces(search, page, pageSize);
  }
}

export class GetWorkspaceMembersAdminUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
    return this.repo.getWorkspaceMembers(workspaceId);
  }
}
