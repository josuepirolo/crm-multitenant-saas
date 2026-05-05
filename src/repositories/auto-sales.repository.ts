import { SupabaseClient } from "@supabase/supabase-js";
import type { AutoSalesInventory, AutoSalesInventoryPricing, AutoSalesOptionalItem, AutoSalesProposal } from "@/types";

export interface InventoryFilters {
  status?: string;
  modelId?: string;
  color?: string;
  condition?: string;
  yearFrom?: number;
  yearTo?: number;
  maxPrice?: number;
  acceptsTradeIn?: boolean;
}

export interface CreateInventoryDTO {
  workspace_id: string;
  model_id: string;
  color: string;
  year_manufacture: number;
  year_model: number;
  mileage_km?: number;
  trim?: string;
  plate?: string;
  fuel?: string;
  transmission?: string;
  chassis?: string;
  renavam?: string;
  condition?: string;
  has_sinistro?: boolean;
  has_cautelar_issue?: boolean;
  accepts_trade_in?: boolean;
  requires_down_pay?: boolean;
  accepts_financing?: boolean;
  notes?: string;
}

export interface CreateProposalDTO {
  workspace_id: string;
  contact_id?: string;
  inventory_id?: string;
  trade_in_plate?: string;
  trade_in_model_id?: string;
  trade_in_year?: number;
  trade_in_mileage_km?: number;
  trade_in_estimated_value?: number;
  final_price?: number;
  down_payment?: number;
  financing_months?: number;
  financing_institution?: string;
  notes?: string;
  expires_at?: string;
}

export interface IAutoSalesRepository {
  listInventory(workspaceId: string, filters?: InventoryFilters): Promise<AutoSalesInventory[]>;
  findInventoryById(id: string, workspaceId: string): Promise<AutoSalesInventory | null>;
  createInventory(data: CreateInventoryDTO): Promise<AutoSalesInventory>;
  updateInventory(id: string, workspaceId: string, data: Partial<CreateInventoryDTO>): Promise<AutoSalesInventory>;
  updateStatus(id: string, workspaceId: string, status: AutoSalesInventory['status']): Promise<void>;
  upsertPricing(data: Omit<AutoSalesInventoryPricing, 'markup_pct' | 'margin_pct' | 'updated_at'> & { workspace_id: string }): Promise<AutoSalesInventoryPricing>;
  listOptionals(inventoryId: string): Promise<AutoSalesOptionalItem[]>;
  addOptional(data: Omit<AutoSalesOptionalItem, 'id'>): Promise<AutoSalesOptionalItem>;
  removeOptional(id: string): Promise<void>;
  listProposals(workspaceId: string): Promise<AutoSalesProposal[]>;
  createProposal(data: CreateProposalDTO): Promise<AutoSalesProposal>;
  updateProposalStatus(id: string, workspaceId: string, status: AutoSalesProposal['status']): Promise<void>;
}

export class SupabaseAutoSalesRepository implements IAutoSalesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listInventory(workspaceId: string, filters?: InventoryFilters): Promise<AutoSalesInventory[]> {
    let q = this.client
      .from("auto_sales_inventory")
      .select("*, model:vehicle_models(id,name,slug,brand:vehicle_brands(id,name)), pricing:auto_sales_inventory_pricing(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (filters?.status)        q = q.eq("status", filters.status);
    if (filters?.modelId)       q = q.eq("model_id", filters.modelId);
    if (filters?.color)         q = q.ilike("color", `%${filters.color}%`);
    if (filters?.condition)     q = q.eq("condition", filters.condition);
    if (filters?.yearFrom)      q = q.gte("year_model", filters.yearFrom);
    if (filters?.yearTo)        q = q.lte("year_model", filters.yearTo);
    if (filters?.acceptsTradeIn !== undefined) q = q.eq("accepts_trade_in", filters.acceptsTradeIn);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AutoSalesInventory[];
  }

  async findInventoryById(id: string, workspaceId: string): Promise<AutoSalesInventory | null> {
    const { data } = await this.client
      .from("auto_sales_inventory")
      .select("*, model:vehicle_models(id,name,slug,brand:vehicle_brands(id,name)), pricing:auto_sales_inventory_pricing(*), optionals:auto_sales_optional_items(*)")
      .eq("id", id).eq("workspace_id", workspaceId).single();
    return data as unknown as AutoSalesInventory ?? null;
  }

  async createInventory(data: CreateInventoryDTO): Promise<AutoSalesInventory> {
    const { data: row, error } = await this.client
      .from("auto_sales_inventory").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as unknown as AutoSalesInventory;
  }

  async updateInventory(id: string, workspaceId: string, data: Partial<CreateInventoryDTO>): Promise<AutoSalesInventory> {
    const { data: row, error } = await this.client
      .from("auto_sales_inventory").update(data).eq("id", id).eq("workspace_id", workspaceId).select().single();
    if (error) throw new Error(error.message);
    return row as unknown as AutoSalesInventory;
  }

  async updateStatus(id: string, workspaceId: string, status: AutoSalesInventory['status']): Promise<void> {
    const { error } = await this.client
      .from("auto_sales_inventory").update({ status }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async upsertPricing(data: Omit<AutoSalesInventoryPricing, 'markup_pct' | 'margin_pct' | 'updated_at'> & { workspace_id: string }): Promise<AutoSalesInventoryPricing> {
    // Valida ownership: inventory_id deve pertencer ao workspace antes do upsert
    const { data: inv } = await this.client
      .from("auto_sales_inventory")
      .select("id")
      .eq("id", data.inventory_id)
      .eq("workspace_id", data.workspace_id)
      .single();
    if (!inv) throw new Error("Veículo não encontrado neste workspace.");
    const { workspace_id: _, ...pricingData } = data;
    const { data: row, error } = await this.client
      .from("auto_sales_inventory_pricing").upsert(pricingData, { onConflict: "inventory_id" }).select().single();
    if (error) throw new Error(error.message);
    return row as AutoSalesInventoryPricing;
  }

  async listOptionals(inventoryId: string): Promise<AutoSalesOptionalItem[]> {
    const { data, error } = await this.client
      .from("auto_sales_optional_items").select("*").eq("inventory_id", inventoryId);
    if (error) throw new Error(error.message);
    return (data ?? []) as AutoSalesOptionalItem[];
  }

  async addOptional(data: Omit<AutoSalesOptionalItem, 'id'>): Promise<AutoSalesOptionalItem> {
    const { data: row, error } = await this.client
      .from("auto_sales_optional_items").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as AutoSalesOptionalItem;
  }

  async removeOptional(id: string): Promise<void> {
    const { error } = await this.client.from("auto_sales_optional_items").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async listProposals(workspaceId: string): Promise<AutoSalesProposal[]> {
    const { data, error } = await this.client
      .from("auto_sales_proposals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AutoSalesProposal[];
  }

  async createProposal(data: CreateProposalDTO): Promise<AutoSalesProposal> {
    const { data: row, error } = await this.client
      .from("auto_sales_proposals").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as AutoSalesProposal;
  }

  async updateProposalStatus(id: string, workspaceId: string, status: AutoSalesProposal['status']): Promise<void> {
    const { error } = await this.client
      .from("auto_sales_proposals").update({ status }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }
}
