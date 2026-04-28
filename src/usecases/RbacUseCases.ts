import type { IRbacRepository } from "@/repositories/rbac.repository";
import type { Permission, PermissionAction, PermissionModule, WorkspaceRole } from "@/types";
import { can, PERMISSIONS } from "@/lib/permissions";
import type { MemberRole } from "@/types";

export class ListPermissionsUseCase {
  constructor(private readonly repo: IRbacRepository) {}
  async execute(): Promise<Permission[]> {
    return this.repo.listPermissions();
  }
}

export class ListWorkspaceRolesUseCase {
  constructor(private readonly repo: IRbacRepository) {}
  async execute(workspaceId: string): Promise<WorkspaceRole[]> {
    return this.repo.listWorkspaceRoles(workspaceId);
  }
}

export class CreateWorkspaceRoleUseCase {
  constructor(private readonly repo: IRbacRepository) {}
  async execute(workspaceId: string, name: string): Promise<WorkspaceRole> {
    if (!name.trim()) throw new Error("Nome do perfil é obrigatório.");
    return this.repo.createRole(workspaceId, name.trim());
  }
}

export class DeleteWorkspaceRoleUseCase {
  constructor(private readonly repo: IRbacRepository) {}
  async execute(roleId: string): Promise<void> {
    return this.repo.deleteRole(roleId);
  }
}

export class SetRolePermissionsUseCase {
  constructor(private readonly repo: IRbacRepository) {}
  async execute(roleId: string, permissionIds: string[]): Promise<void> {
    return this.repo.setRolePermissions(roleId, permissionIds);
  }
}

export class AssignRoleToMemberUseCase {
  constructor(private readonly repo: IRbacRepository) {}
  async execute(memberId: string, roleId: string): Promise<void> {
    return this.repo.assignRoleToMember(memberId, roleId);
  }
}

/**
 * Resolve permissão efetiva do usuário — RBAC granular quando disponível,
 * fallback para matriz hardcoded quando workspace_role_id não está definido.
 */
export class CheckEffectivePermissionUseCase {
  constructor(private readonly repo: IRbacRepository) {}

  async execute(
    workspaceId: string,
    userId: string,
    legacyRole: MemberRole | null,
    module: PermissionModule,
    action: PermissionAction
  ): Promise<boolean> {
    const hasRbac = await this.repo.hasActiveRbac(workspaceId, userId);

    if (hasRbac) {
      const perms = await this.repo.getEffectivePermissions(workspaceId, userId);
      return perms.has(`${module}:${action}`);
    }

    // Fallback: matriz hardcoded de permissions.ts
    return can(legacyRole, module, action);
  }
}
