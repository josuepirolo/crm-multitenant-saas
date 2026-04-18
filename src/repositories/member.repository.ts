import { SupabaseClient } from "@supabase/supabase-js";
import type { MemberRole, WorkspaceMember } from "@/types";

export interface InviteMemberDTO {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
}

export interface IWorkspaceMemberRepository {
  findByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  findRole(workspaceId: string, userId: string): Promise<MemberRole | null>;
  invite(data: InviteMemberDTO): Promise<WorkspaceMember>;
  updateRole(workspaceId: string, userId: string, role: MemberRole): Promise<void>;
  deactivate(workspaceId: string, userId: string): Promise<void>;
}

export class SupabaseWorkspaceMemberRepository implements IWorkspaceMemberRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await this.client
      .from("workspace_members")
      .select("*, profiles(name, avatar_url, email:id)")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at");

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findRole(workspaceId: string, userId: string): Promise<MemberRole | null> {
    const { data } = await this.client
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    return (data?.role as MemberRole) ?? null;
  }

  async invite({ workspace_id, user_id, role }: InviteMemberDTO): Promise<WorkspaceMember> {
    const { data, error } = await this.client
      .from("workspace_members")
      .insert({ workspace_id, user_id, role })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateRole(workspaceId: string, userId: string, role: MemberRole): Promise<void> {
    const { error } = await this.client
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async deactivate(workspaceId: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from("workspace_members")
      .update({ deleted_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
  }
}
