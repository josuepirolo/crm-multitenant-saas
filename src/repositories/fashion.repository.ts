import { SupabaseClient } from "@supabase/supabase-js";
import type { FashionProduct, FashionProductVariant, FashionVariantPricing, FashionVariantStock } from "@/types";

export interface FashionProductFilters { category?: string; gender?: string; search?: string; }

export interface CreateProductDTO {
  workspace_id: string; name: string; description?: string;
  category: string; gender?: string; brand?: string;
}

export interface CreateVariantDTO {
  product_id: string; color: string; size: string; sku: string;
}

export interface IFashionRepository {
  listProducts(workspaceId: string, filters?: FashionProductFilters): Promise<FashionProduct[]>;
  findProductById(id: string, workspaceId: string): Promise<(FashionProduct & { variants: FashionProductVariant[] }) | null>;
  createProduct(data: CreateProductDTO): Promise<FashionProduct>;
  updateProduct(id: string, workspaceId: string, data: Partial<CreateProductDTO>): Promise<FashionProduct>;
  toggleProductActive(id: string, workspaceId: string, active: boolean): Promise<void>;
  listVariants(productId: string): Promise<FashionProductVariant[]>;
  createVariant(data: CreateVariantDTO): Promise<FashionProductVariant>;
  upsertPricing(data: Omit<FashionVariantPricing, 'markup_pct' | 'margin_pct' | 'updated_at'>): Promise<FashionVariantPricing>;
  updateStock(variantId: string, workspaceId: string, quantity: number): Promise<FashionVariantStock>;
  listLowStock(workspaceId: string): Promise<any[]>;
}

export class SupabaseFashionRepository implements IFashionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listProducts(workspaceId: string, filters?: FashionProductFilters): Promise<FashionProduct[]> {
    let q = this.client.from("fashion_products").select("*").eq("workspace_id", workspaceId).eq("is_active", true).order("category").order("name");
    if (filters?.category) q = q.eq("category", filters.category);
    if (filters?.gender)   q = q.eq("gender", filters.gender);
    if (filters?.search)   q = q.ilike("name", `%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as FashionProduct[];
  }

  async findProductById(id: string, workspaceId: string): Promise<(FashionProduct & { variants: FashionProductVariant[] }) | null> {
    const { data } = await this.client
      .from("fashion_products")
      .select("*, variants:fashion_product_variants(*, pricing:fashion_variant_pricing(*), stock:fashion_variant_stock(*))")
      .eq("id", id).eq("workspace_id", workspaceId).single();
    return data as unknown as FashionProduct & { variants: FashionProductVariant[] } ?? null;
  }

  async createProduct(data: CreateProductDTO): Promise<FashionProduct> {
    const { data: row, error } = await this.client.from("fashion_products").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as FashionProduct;
  }

  async updateProduct(id: string, workspaceId: string, data: Partial<CreateProductDTO>): Promise<FashionProduct> {
    const { data: row, error } = await this.client
      .from("fashion_products").update(data).eq("id", id).eq("workspace_id", workspaceId).select().single();
    if (error) throw new Error(error.message);
    return row as FashionProduct;
  }

  async toggleProductActive(id: string, workspaceId: string, active: boolean): Promise<void> {
    const { error } = await this.client
      .from("fashion_products").update({ is_active: active }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  }

  async listVariants(productId: string): Promise<FashionProductVariant[]> {
    const { data, error } = await this.client
      .from("fashion_product_variants").select("*").eq("product_id", productId).eq("is_active", true).order("color").order("size");
    if (error) throw new Error(error.message);
    return (data ?? []) as FashionProductVariant[];
  }

  async createVariant(data: CreateVariantDTO): Promise<FashionProductVariant> {
    const { data: row, error } = await this.client.from("fashion_product_variants").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as FashionProductVariant;
  }

  async upsertPricing(data: Omit<FashionVariantPricing, 'markup_pct' | 'margin_pct' | 'updated_at'>): Promise<FashionVariantPricing> {
    const { data: row, error } = await this.client
      .from("fashion_variant_pricing").upsert(data, { onConflict: "variant_id,workspace_id" }).select().single();
    if (error) throw new Error(error.message);
    return row as FashionVariantPricing;
  }

  async updateStock(variantId: string, workspaceId: string, quantity: number): Promise<FashionVariantStock> {
    const { data: row, error } = await this.client
      .from("fashion_variant_stock")
      .upsert({ variant_id: variantId, workspace_id: workspaceId, quantity }, { onConflict: "variant_id,workspace_id" })
      .select().single();
    if (error) throw new Error(error.message);
    return row as FashionVariantStock;
  }

  async listLowStock(workspaceId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from("fashion_variant_stock")
      .select("*, variant:fashion_product_variants(id,color,size,sku,product:fashion_products(id,name,category))")
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).filter((r: any) => r.quantity <= r.min_stock) as any[];
  }
}
