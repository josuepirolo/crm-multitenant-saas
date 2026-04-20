import type { IWorkspaceMemberRepository, InviteMemberDTO } from "@/repositories/member.repository";
import type { MemberRole, WorkspaceMember, WorkspaceMemberWithProfile } from "@/types";

export class ListMembersUseCase {
  constructor(private readonly repo: IWorkspaceMemberRepository) {}

  async execute(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
    return this.repo.findByWorkspace(workspaceId);
  }
}

export class InviteMemberUseCase {
  constructor(private readonly repo: IWorkspaceMemberRepository) {}

  async execute(data: InviteMemberDTO): Promise<WorkspaceMember> {
    const existing = await this.repo.findRole(data.workspace_id, data.user_id);
    if (existing) throw new Error("Este usuário já é membro do workspace.");
    return this.repo.invite(data);
  }
}

export class UpdateMemberRoleUseCase {
  constructor(private readonly repo: IWorkspaceMemberRepository) {}

  async execute(workspaceId: string, targetUserId: string, requestingUserId: string, role: MemberRole): Promise<void> {
    if (targetUserId === requestingUserId) throw new Error("Você não pode alterar sua própria função.");
    const currentRole = await this.repo.findRole(workspaceId, targetUserId);
    if (currentRole === "owner") throw new Error("A função do proprietário não pode ser alterada.");
    return this.repo.updateRole(workspaceId, targetUserId, role);
  }
}

export class DeactivateMemberUseCase {
  constructor(private readonly repo: IWorkspaceMemberRepository) {}

  async execute(workspaceId: string, targetUserId: string, requestingUserId: string): Promise<void> {
    if (targetUserId === requestingUserId) throw new Error("Você não pode desativar sua própria conta.");
    const role = await this.repo.findRole(workspaceId, targetUserId);
    if (role === "owner") throw new Error("O proprietário do workspace não pode ser removido.");
    return this.repo.deactivate(workspaceId, targetUserId);
  }
}
