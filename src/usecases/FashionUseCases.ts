import type { IFashionRepository, CreateProductDTO, CreateVariantDTO, FashionProductFilters } from "@/repositories/fashion.repository";
import type { FashionProduct, FashionProductVariant, FashionVariantPricing, FashionVariantStock } from "@/types";

export class ListFashionProductsUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(workspaceId: string, filters?: FashionProductFilters): Promise<FashionProduct[]> {
    return this.repo.listProducts(workspaceId, filters);
  }
}

export class GetFashionProductUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(id: string, workspaceId: string) {
    const product = await this.repo.findProductById(id, workspaceId);
    if (!product) throw new Error("Produto não encontrado.");
    return product;
  }
}

export class CreateFashionProductUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(data: CreateProductDTO): Promise<FashionProduct> {
    if (!data.name.trim())     throw new Error("Nome do produto é obrigatório.");
    if (!data.category.trim()) throw new Error("Categoria é obrigatória.");
    return this.repo.createProduct({ ...data, name: data.name.trim() });
  }
}

export class UpdateFashionProductUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(id: string, workspaceId: string, data: Partial<CreateProductDTO>): Promise<FashionProduct> {
    if (data.name !== undefined && !data.name.trim()) throw new Error("Nome não pode ser vazio.");
    return this.repo.updateProduct(id, workspaceId, data);
  }
}

export class ToggleFashionProductActiveUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(id: string, workspaceId: string, active: boolean): Promise<void> {
    return this.repo.toggleProductActive(id, workspaceId, active);
  }
}

export class AddFashionVariantUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(data: CreateVariantDTO): Promise<FashionProductVariant> {
    if (!data.color.trim()) throw new Error("Cor é obrigatória.");
    if (!data.size.trim())  throw new Error("Tamanho é obrigatório.");
    if (!data.sku.trim())   throw new Error("SKU é obrigatório.");
    return this.repo.createVariant(data);
  }
}

export class UpsertVariantPricingUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(data: Omit<FashionVariantPricing, 'markup_pct' | 'margin_pct' | 'updated_at'>): Promise<FashionVariantPricing> {
    if (data.cost_price < 0) throw new Error("Preço de custo não pode ser negativo.");
    if (data.sale_price < 0) throw new Error("Preço de venda não pode ser negativo.");
    return this.repo.upsertPricing(data);
  }
}

export class UpdateVariantStockUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(variantId: string, workspaceId: string, quantity: number): Promise<FashionVariantStock> {
    if (quantity < 0) throw new Error("Estoque não pode ser negativo.");
    return this.repo.updateStock(variantId, workspaceId, quantity);
  }
}

export class ListLowStockUseCase {
  constructor(private readonly repo: IFashionRepository) {}
  async execute(workspaceId: string): Promise<any[]> {
    return this.repo.listLowStock(workspaceId);
  }
}
