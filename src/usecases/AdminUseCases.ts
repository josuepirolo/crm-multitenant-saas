import type { IAdminRepository } from "@/repositories/admin.repository";
import type { AdminGlobalStats, MemberRole, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";

export class GetAdminStatsUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(): Promise<AdminGlobalStats> {
    return this.repo.getStats();
  }
}

export class ListAllWorkspacesUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(search: string, page: number, pageSize: number, isActive?: boolean): Promise<{ data: WorkspaceWithStats[]; total: number }> {
    return this.repo.listWorkspaces(search, page, pageSize, isActive);
  }
}

export class GetWorkspaceMembersAdminUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
    return this.repo.getWorkspaceMembers(workspaceId);
  }
}

export class UpdateWorkspaceAdminUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(id: string, name: string): Promise<void> {
    if (!name.trim()) throw new Error("Nome é obrigatório");
    return this.repo.updateWorkspace(id, { name: name.trim() });
  }
}

export class SetWorkspaceActiveUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(id: string, active: boolean): Promise<void> {
    return this.repo.setWorkspaceActive(id, active);
  }
}

export class ChangeMemberRoleAdminUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async execute(memberId: string, role: MemberRole): Promise<void> {
    return this.repo.changeMemberRole(memberId, role);
  }
}
