import { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessNiche } from "@/types";

export interface CreateNicheDTO {
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateNicheDTO {
  name?: string;
  slug?: string;
  description?: string;
  sort_order?: number;
}

export interface INicheRepository {
  listAll(): Promise<BusinessNiche[]>;
  listActive(): Promise<BusinessNiche[]>;
  findById(id: string): Promise<BusinessNiche | null>;
  create(data: CreateNicheDTO): Promise<BusinessNiche>;
  update(id: string, data: UpdateNicheDTO): Promise<BusinessNiche>;
  setActive(id: string, active: boolean): Promise<void>;
  isUsedByWorkspace(id: string): Promise<boolean>;
}

export class SupabaseNicheRepository implements INicheRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listAll(): Promise<BusinessNiche[]> {
    const { data, error } = await this.client
      .from("business_niches")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as BusinessNiche[];
  }

  async listActive(): Promise<BusinessNiche[]> {
    const { data, error } = await this.client
      .from("business_niches")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as BusinessNiche[];
  }

  async findById(id: string): Promise<BusinessNiche | null> {
    const { data } = await this.client
      .from("business_niches")
      .select("*")
      .eq("id", id)
      .single();
    return (data as BusinessNiche) ?? null;
  }

  async create(data: CreateNicheDTO): Promise<BusinessNiche> {
    const { data: row, error } = await this.client
      .from("business_niches")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as BusinessNiche;
  }

  async update(id: string, data: UpdateNicheDTO): Promise<BusinessNiche> {
    const { data: row, error } = await this.client
      .from("business_niches")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as BusinessNiche;
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.client
      .from("business_niches")
      .update({ is_active: active })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async isUsedByWorkspace(id: string): Promise<boolean> {
    const { count } = await this.client
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .eq("business_niche_id", id);
    return (count ?? 0) > 0;
  }
}

/** Converte lista plana em árvore hierárquica */
export function buildNicheTree(niches: BusinessNiche[]): BusinessNiche[] {
  const map = new Map<string, BusinessNiche>();
  niches.forEach((n) => map.set(n.id, { ...n, children: [] }));

  const roots: BusinessNiche[] = [];
  map.forEach((node) => {
    if (node.parent_id) {
      const parent = map.get(node.parent_id);
      if (parent) parent.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}
