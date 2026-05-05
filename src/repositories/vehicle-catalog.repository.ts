import { SupabaseClient } from "@supabase/supabase-js";
import type { VehicleCategory, VehicleBrand, VehicleModel } from "@/types";

export interface CreateVehicleBrandDTO { name: string; slug?: string; sort_order?: number; }
export interface CreateVehicleModelDTO {
  brand_id: string; category_id: string; name: string; slug?: string;
  year_from?: number; year_to?: number; engine_cc?: number; notes?: string;
}

export interface IVehicleCatalogRepository {
  listCategories(): Promise<VehicleCategory[]>;
  listBrands(): Promise<VehicleBrand[]>;
  listModels(brandId?: string, categoryId?: string): Promise<VehicleModel[]>;
  findModelById(id: string): Promise<VehicleModel | null>;
  createBrand(data: CreateVehicleBrandDTO): Promise<VehicleBrand>;
  createModel(data: CreateVehicleModelDTO): Promise<VehicleModel>;
  updateModel(id: string, data: Partial<CreateVehicleModelDTO>): Promise<VehicleModel>;
}

export class SupabaseVehicleCatalogRepository implements IVehicleCatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCategories(): Promise<VehicleCategory[]> {
    const { data, error } = await this.client
      .from("vehicle_categories")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as VehicleCategory[];
  }

  async listBrands(): Promise<VehicleBrand[]> {
    const { data, error } = await this.client
      .from("vehicle_brands")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as VehicleBrand[];
  }

  async listModels(brandId?: string, categoryId?: string): Promise<VehicleModel[]> {
    let q = this.client
      .from("vehicle_models")
      .select("*, brand:vehicle_brands(id,name,slug), category:vehicle_categories(id,name,slug)")
      .order("name");
    if (brandId)    q = q.eq("brand_id", brandId);
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as VehicleModel[];
  }

  async findModelById(id: string): Promise<VehicleModel | null> {
    const { data } = await this.client
      .from("vehicle_models")
      .select("*, brand:vehicle_brands(id,name,slug), category:vehicle_categories(id,name,slug)")
      .eq("id", id)
      .single();
    return data as unknown as VehicleModel ?? null;
  }

  async createBrand(data: CreateVehicleBrandDTO): Promise<VehicleBrand> {
    const { data: row, error } = await this.client
      .from("vehicle_brands").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as VehicleBrand;
  }

  async createModel(data: CreateVehicleModelDTO): Promise<VehicleModel> {
    const { data: row, error } = await this.client
      .from("vehicle_models").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as unknown as VehicleModel;
  }

  async updateModel(id: string, data: Partial<CreateVehicleModelDTO>): Promise<VehicleModel> {
    const { data: row, error } = await this.client
      .from("vehicle_models").update(data).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return row as unknown as VehicleModel;
  }
}
