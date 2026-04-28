import { SupabaseClient } from "@supabase/supabase-js";
import type { Permission, PermissionAction, PermissionModule, WorkspaceRole } from "@/types";

export interface IRbacRepository {
  listPermissions(): Promise<Permission[]>;
  listWorkspaceRoles(workspaceId: string): Promise<WorkspaceRole[]>;
  getEffectivePermissions(workspaceId: string, userId: string): Promise<Set<string>>;
  createRole(workspaceId: string, name: string): Promise<WorkspaceRole>;
  deleteRole(roleId: string): Promise<void>;
  setRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
  assignRoleToMember(memberId: string, roleId: string): Promise<void>;
}

export class SupabaseRbacRepository implements IRbacRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPermissions(): Promise<Permission[]> {
    const { data, error } = await this.client
      .from("permissions")
      .select("*")
      .order("module")
      .order("action");
    if (error) throw new Error(error.message);
    return (data ?? []) as Permission[];
  }

  async listWorkspaceRoles(workspaceId: string): Promise<WorkspaceRole[]> {
    const { data, error } = await this.client
      .from("workspace_roles")
      .select("*, workspace_role_permissions(permission_id, permissions(*))")
      .eq("workspace_id", workspaceId)
      .order("is_system", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);

    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      workspace_id: r.workspace_id as string,
      name: r.name as string,
      is_system: r.is_system as boolean,
      created_at: r.created_at as string,
      permissions: ((r.workspace_role_permissions as { permissions: Permission }[]) ?? [])
        .map((wrp) => wrp.permissions),
    }));
  }

  async getEffectivePermissions(workspaceId: string, userId: string): Promise<Set<string>> {
    const { data, error } = await this.client
      .from("workspace_members")
      .select("workspace_role_id, workspace_roles(workspace_role_permissions(permissions(key)))")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data?.workspace_role_id) return new Set(); // fallback: sem RBAC ativo

    type Row = { workspace_roles: { workspace_role_permissions: { permissions: { key: string } }[] } | null };
    const row = data as unknown as Row;
    const keys = (row.workspace_roles?.workspace_role_permissions ?? [])
      .map((wrp) => wrp.permissions?.key)
      .filter(Boolean) as string[];

    return new Set(keys);
  }

  async createRole(workspaceId: string, name: string): Promise<WorkspaceRole> {
    const { data, error } = await this.client
      .from("workspace_roles")
      .insert({ workspace_id: workspaceId, name, is_system: false })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as WorkspaceRole;
  }

  async deleteRole(roleId: string): Promise<void> {
    // Protege roles de sistema — a check constraint é na UI; aqui rejeitamos no código
    const { data: role } = await this.client
      .from("workspace_roles")
      .select("is_system")
      .eq("id", roleId)
      .single();
    if (role?.is_system) throw new Error("Roles de sistema não podem ser removidas.");

    const { error } = await this.client.from("workspace_roles").delete().eq("id", roleId);
    if (error) throw new Error(error.message);
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.client.from("workspace_role_permissions").delete().eq("role_id", roleId);
    if (permissionIds.length === 0) return;
    const rows = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }));
    const { error } = await this.client.from("workspace_role_permissions").insert(rows);
    if (error) throw new Error(error.message);
  }

  async assignRoleToMember(memberId: string, roleId: string): Promise<void> {
    const { error } = await this.client
      .from("workspace_members")
      .update({ workspace_role_id: roleId })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  }

  // Helper: verifica se workspace_role_id está definido para o usuário (RBAC ativo)
  async hasActiveRbac(workspaceId: string, userId: string): Promise<boolean> {
    const { data } = await this.client
      .from("workspace_members")
      .select("workspace_role_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    return !!data?.workspace_role_id;
  }

  canModuleAction(permissions: Set<string>, module: PermissionModule, action: PermissionAction): boolean {
    return permissions.has(`${module}:${action}`);
  }
}
