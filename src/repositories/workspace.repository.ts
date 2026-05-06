import { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "@/types";

export interface CreateWorkspaceDTO {
  name: string;
  slug: string;
  owner_id: string;
  business_niche_id: string;
}

export interface UpdateWorkspaceDTO {
  name?: string;
  logo_url?: string | null;
  display_name?: string | null;
  legal_name?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zipcode?: string | null;
  address_country?: string | null;
}

export interface IWorkspaceRepository {
  create(data: CreateWorkspaceDTO): Promise<Workspace>;
  findById(id: string): Promise<Workspace | null>;
  update(id: string, data: UpdateWorkspaceDTO): Promise<Workspace>;
}

export class SupabaseWorkspaceRepository implements IWorkspaceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create({ name, slug, owner_id, business_niche_id }: CreateWorkspaceDTO): Promise<Workspace> {
    const { data: workspace, error: wError } = await this.client
      .from("workspaces")
      .insert({ name, slug, business_niche_id })
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

  async update(id: string, data: UpdateWorkspaceDTO): Promise<Workspace> {
    const { data: workspace, error } = await this.client
      .from("workspaces")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return workspace;
  }
}
