import { SupabaseClient } from "@supabase/supabase-js";
import type { AdminGlobalStats, MemberRole, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";

export interface IAdminRepository {
  getStats(): Promise<AdminGlobalStats>;
  listWorkspaces(search: string, page: number, pageSize: number, isActive?: boolean): Promise<{ data: WorkspaceWithStats[]; total: number }>;
  getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithProfile[]>;
  updateWorkspace(id: string, data: { name: string }): Promise<void>;
  setWorkspaceActive(id: string, active: boolean): Promise<void>;
  changeMemberRole(memberId: string, role: MemberRole): Promise<void>;
}

export class SupabaseAdminRepository implements IAdminRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getStats(): Promise<AdminGlobalStats> {
    const [workspaces, members, contacts, deals] = await Promise.all([
      this.client.from("workspaces").select("id", { count: "exact", head: true }),
      this.client.from("workspace_members").select("id", { count: "exact", head: true }).is("deleted_at", null),
      this.client.from("contacts").select("id", { count: "exact", head: true }).is("deleted_at", null),
      this.client.from("deals").select("id", { count: "exact", head: true }).is("deleted_at", null),
    ]);

    return {
      total_workspaces: workspaces.count ?? 0,
      total_members:    members.count ?? 0,
      total_contacts:   contacts.count ?? 0,
      total_deals:      deals.count ?? 0,
    };
  }

  async listWorkspaces(search: string, page: number, pageSize: number, isActive?: boolean) {
    const from = page * pageSize;
    const to   = from + pageSize - 1;

    let query = this.client
      .from("workspaces")
      .select("id, name, slug, logo_url, created_at, is_active", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) query = query.ilike("name", `%${search}%`);
    if (isActive !== undefined) query = query.eq("is_active", isActive);

    const { data: workspaces, count, error } = await query;
    if (error) throw new Error(error.message);
    if (!workspaces?.length) return { data: [], total: count ?? 0 };

    const ids = workspaces.map((w) => w.id);

    const [members, contacts, deals] = await Promise.all([
      this.client.from("workspace_members").select("workspace_id").in("workspace_id", ids).is("deleted_at", null),
      this.client.from("contacts").select("workspace_id").in("workspace_id", ids).is("deleted_at", null),
      this.client.from("deals").select("workspace_id").in("workspace_id", ids).is("deleted_at", null),
    ]);

    const toCountMap = (rows: { workspace_id: string }[]) =>
      rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.workspace_id] = (acc[r.workspace_id] ?? 0) + 1;
        return acc;
      }, {});

    const mc = toCountMap(members.data ?? []);
    const cc = toCountMap(contacts.data ?? []);
    const dc = toCountMap(deals.data ?? []);

    return {
      data: workspaces.map((w) => ({
        ...w,
        member_count:  mc[w.id] ?? 0,
        contact_count: cc[w.id] ?? 0,
        deal_count:    dc[w.id] ?? 0,
      })),
      total: count ?? 0,
    };
  }

  async updateWorkspace(id: string, data: { name: string }): Promise<void> {
    const { error } = await this.client.from("workspaces").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async setWorkspaceActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.client.from("workspaces").update({ is_active: active }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async changeMemberRole(memberId: string, role: MemberRole): Promise<void> {
    const { error } = await this.client.from("workspace_members").update({ role }).eq("id", memberId);
    if (error) throw new Error(error.message);
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
    const { data, error } = await this.client
      .from("workspace_members")
      .select("*, profiles(name, email, avatar_url)")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at");

    if (error) throw new Error(error.message);
    return (data ?? []) as WorkspaceMemberWithProfile[];
  }
}
