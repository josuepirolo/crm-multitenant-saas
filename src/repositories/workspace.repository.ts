import { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "@/types";

export interface CreateWorkspaceDTO {
  name: string;
  slug: string;
  owner_id: string;
}

export interface IWorkspaceRepository {
  create(data: CreateWorkspaceDTO): Promise<Workspace>;
  findById(id: string): Promise<Workspace | null>;
}

export class SupabaseWorkspaceRepository implements IWorkspaceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create({ name, slug, owner_id }: CreateWorkspaceDTO): Promise<Workspace> {
    const { data: workspace, error: wError } = await this.client
      .from("workspaces")
      .insert({ name, slug })
      .select()
      .single();

    if (wError) throw new Error(`Erro ao criar workspace: ${wError.message}`);

    const { error: mError } = await this.client
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: owner_id, role: "owner" });

    if (mError) throw new Error(`Erro ao vincular membro: ${mError.message}`);

    const { error: pError } = await this.client
      .from("profiles")
      .update({ current_workspace_id: workspace.id })
      .eq("id", owner_id);

    if (pError) throw new Error(`Erro ao atualizar perfil: ${pError.message}`);

    return workspace;
  }

  async findById(id: string): Promise<Workspace | null> {
    const { data, error } = await this.client
      .from("workspaces")
      .select()
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }
}
