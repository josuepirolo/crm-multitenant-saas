import { SupabaseClient } from "@supabase/supabase-js";
import type {
  AutoPartsCatalog, AutoPartsCompatibility, AutoPartsWorkspacePricing,
  AutoPartsQuote, AutoPartsQuoteItem,
} from "@/types";

export interface AutoPartsFilters {
  category?: string;
  modelId?: string;
  search?: string;
}

export interface CreateQuoteDTO {
  workspace_id: string;
  contact_id?: string;
  notes?: string;
  expires_at?: string;
}

export interface CreateQuoteItemDTO {
  quote_id: string;
  part_id?: string;
  part_number_snap: string;
  name_snap: string;
  color_snap?: string;
  unit_snap: string;
  quantity: number;
  unit_price: number;
}

export interface IAutoPartsRepository {
  listCatalog(filters?: AutoPartsFilters): Promise<AutoPartsCatalog[]>;
  findPartById(id: string): Promise<AutoPartsCatalog | null>;
  listCompatibleModels(partId: string): Promise<AutoPartsCompatibility[]>;
  listCompatibleParts(modelId: string, workspaceId: string): Promise<(AutoPartsCatalog & { pricing?: AutoPartsWorkspacePricing })[]>;
  getPricing(partId: string, workspaceId: string): Promise<AutoPartsWorkspacePricing | null>;
  upsertPricing(data: Omit<AutoPartsWorkspacePricing, 'markup_pct' | 'margin_pct' | 'updated_at'>): Promise<AutoPartsWorkspacePricing>;
  listQuotes(workspaceId: string): Promise<AutoPartsQuote[]>;
  findQuoteById(id: string, workspaceId: string): Promise<(AutoPartsQuote & { items: AutoPartsQuoteItem[] }) | null>;
  createQuote(data: CreateQuoteDTO): Promise<AutoPartsQuote>;
  updateQuoteStatus(id: string, workspaceId: string, status: AutoPartsQuote['status']): Promise<void>;
  addQuoteItem(data: CreateQuoteItemDTO): Promise<AutoPartsQuoteItem>;
  removeQuoteItem(itemId: string, quoteId: string): Promise<void>;
}

export class SupabaseAutoPartsRepository implements IAutoPartsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCatalog(filters?: AutoPartsFilters): Promise<AutoPartsCatalog[]> {
    let q = this.client.from("auto_parts_catalog").select("*").eq("is_active", true).order("category").order("name");
    if (filters?.category) q = q.eq("category", filters.category);
    if (filters?.search)   q = q.ilike("name", `%${filters.search}%`);
    if (filters?.modelId) {
      const { data: compat } = await this.client
        .from("auto_parts_compatibility").select("part_id").eq("model_id", filters.modelId);
      const ids = (compat ?? []).map((c: any) => c.part_id);
      if (ids.length === 0) return [];
      q = q.in("id", ids);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as AutoPartsCatalog[];
  }

  async findPartById(id: string): Promise<AutoPartsCatalog | null> {
    const { data } = await this.client.from("auto_parts_catalog").select("*").eq("id", id).single();
    return data as AutoPartsCatalog ?? null;
  }

  async listCompatibleModels(partId: string): Promise<AutoPartsCompatibility[]> {
    const { data, error } = await this.client
      .from("auto_parts_compatibility")
      .select("*, model:vehicle_models(id,name,slug,brand:vehicle_brands(id,name))")
      .eq("part_id", partId);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AutoPartsCompatibility[];
  }

  async listCompatibleParts(modelId: string, workspaceId: string): Promise<(AutoPartsCatalog & { pricing?: AutoPartsWorkspacePricing })[]> {
    const { data: compat } = await this.client
      .from("auto_parts_compatibility").select("part_id").eq("model_id", modelId);
    const ids = (compat ?? []).map((c: any) => c.part_id);
    if (ids.length === 0) return [];
    const { data, error } = await this.client
      .from("auto_parts_catalog")
      .select("*, pricing:auto_parts_workspace_pricing!inner(cost_price,sale_price,markup_pct,margin_pct)")
      .in("id", ids)
      .eq("is_active", true)
      .eq("auto_parts_workspace_pricing.workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as (AutoPartsCatalog & { pricing?: AutoPartsWorkspacePricing })[];
  }

  async getPricing(partId: string, workspaceId: string): Promise<AutoPartsWorkspacePricing | null> {
    const { data } = await this.client
      .from("auto_parts_workspace_pricing")
      .select("*").eq("part_id", partId).eq("workspace_id", workspaceId).single();
    return data as AutoPartsWorkspacePricing ?? null;
  }

  async upsertPricing(data: Omit<AutoPartsWorkspacePricing, 'markup_pct' | 'margin_pct' | 'updated_at'>): Promise<AutoPartsWorkspacePricing> {
    const { data: row, error } = await this.client
      .from("auto_parts_workspace_pricing")
      .upsert(data, { onConflict: "part_id,workspace_id" }).select().single();
    if (error) throw new Error(error.message);
    return row as AutoPartsWorkspacePricing;
  }

  async listQuotes(workspaceId: string): Promise<AutoPartsQuote[]> {
    const { data, error } = await this.client
      .from("auto_parts_quotes").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AutoPartsQuote[];
  }

  async findQuoteById(id: string, workspaceId: string): Promise<(AutoPartsQuote & { items: AutoPartsQuoteItem[] }) | null> {
    const { data, error } = await this.client
      .from("auto_parts_quotes")
      .select("*, items:auto_parts_quote_items(*)")
      .eq("id", id).eq("workspace_id", workspaceId).single();
    if (error) return null;
    return data as unknown as AutoPartsQuote & { items: AutoPartsQuoteItem[] };
  }

  async createQuote(data: CreateQuoteDTO): Promise<AutoPartsQuote> {
    const { data: row, error } = await this.client
      .from("auto_parts_quotes").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as AutoPartsQuote;
  }

  async updateQuoteStatus(id: string, workspaceId: string, status: AutoPartsQuote['status']): Promise<void> {
    const { error } = await this.client
      .from("auto_parts_quotes").update({ status }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async addQuoteItem(data: CreateQuoteItemDTO): Promise<AutoPartsQuoteItem> {
    const { data: row, error } = await this.client
      .from("auto_parts_quote_items").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as AutoPartsQuoteItem;
  }

  async removeQuoteItem(itemId: string, quoteId: string): Promise<void> {
    const { error } = await this.client
      .from("auto_parts_quote_items").delete().eq("id", itemId).eq("quote_id", quoteId);
    if (error) throw new Error(error.message);
  }
}
