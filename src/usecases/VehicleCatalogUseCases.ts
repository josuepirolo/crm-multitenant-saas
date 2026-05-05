import type { IVehicleCatalogRepository, CreateVehicleBrandDTO, CreateVehicleModelDTO } from "@/repositories/vehicle-catalog.repository";
import type { VehicleBrand, VehicleModel, VehicleCategory } from "@/types";

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export class ListVehicleCategoriesUseCase {
  constructor(private readonly repo: IVehicleCatalogRepository) {}
  async execute(): Promise<VehicleCategory[]> { return this.repo.listCategories(); }
}

export class ListVehicleBrandsUseCase {
  constructor(private readonly repo: IVehicleCatalogRepository) {}
  async execute(): Promise<VehicleBrand[]> { return this.repo.listBrands(); }
}

export class ListVehicleModelsUseCase {
  constructor(private readonly repo: IVehicleCatalogRepository) {}
  async execute(brandId?: string, categoryId?: string): Promise<VehicleModel[]> {
    return this.repo.listModels(brandId, categoryId);
  }
}

export class CreateVehicleBrandUseCase {
  constructor(private readonly repo: IVehicleCatalogRepository) {}
  async execute(data: CreateVehicleBrandDTO): Promise<VehicleBrand> {
    if (!data.name.trim()) throw new Error("Nome da marca é obrigatório.");
    const slug = data.slug?.trim() || slugify(data.name);
    return this.repo.createBrand({ ...data, name: data.name.trim(), slug });
  }
}

export class CreateVehicleModelUseCase {
  constructor(private readonly repo: IVehicleCatalogRepository) {}
  async execute(data: CreateVehicleModelDTO): Promise<VehicleModel> {
    if (!data.name.trim())      throw new Error("Nome do modelo é obrigatório.");
    if (!data.brand_id)         throw new Error("Marca é obrigatória.");
    if (!data.category_id)      throw new Error("Categoria é obrigatória.");
    const slug = data.slug?.trim() || slugify(data.name);
    return this.repo.createModel({ ...data, name: data.name.trim(), slug });
  }
}

export class UpdateVehicleModelUseCase {
  constructor(private readonly repo: IVehicleCatalogRepository) {}
  async execute(id: string, data: Partial<CreateVehicleModelDTO>): Promise<VehicleModel> {
    if (data.name !== undefined && !data.name.trim()) throw new Error("Nome não pode ser vazio.");
    return this.repo.updateModel(id, data);
  }
}
