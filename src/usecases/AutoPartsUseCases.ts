import type { IAutoPartsRepository, AutoPartsFilters, CreateQuoteDTO, CreateQuoteItemDTO } from "@/repositories/auto-parts.repository";
import type { AutoPartsCatalog, AutoPartsQuote, AutoPartsWorkspacePricing } from "@/types";

export class ListAutoPartsCatalogUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(filters?: AutoPartsFilters): Promise<AutoPartsCatalog[]> {
    return this.repo.listCatalog(filters);
  }
}

export class ListCompatiblePartsUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(modelId: string, workspaceId: string) {
    if (!modelId) throw new Error("Modelo de veículo é obrigatório.");
    return this.repo.listCompatibleParts(modelId, workspaceId);
  }
}

export class ListCompatibleModelsUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(partId: string) {
    if (!partId) throw new Error("Peça é obrigatória.");
    return this.repo.listCompatibleModels(partId);
  }
}

export class UpsertPartPricingUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(data: Omit<AutoPartsWorkspacePricing, 'markup_pct' | 'margin_pct' | 'updated_at'>): Promise<AutoPartsWorkspacePricing> {
    if (data.cost_price < 0) throw new Error("Preço de custo não pode ser negativo.");
    if (data.sale_price < 0) throw new Error("Preço de venda não pode ser negativo.");
    return this.repo.upsertPricing(data);
  }
}

export class CreateAutoPartsQuoteUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(data: CreateQuoteDTO): Promise<AutoPartsQuote> {
    return this.repo.createQuote(data);
  }
}

export class AddQuoteItemUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(data: CreateQuoteItemDTO) {
    if (data.quantity <= 0) throw new Error("Quantidade deve ser maior que zero.");
    if (data.unit_price < 0) throw new Error("Preço unitário não pode ser negativo.");
    return this.repo.addQuoteItem(data);
  }
}

export class UpdateQuoteStatusUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(id: string, workspaceId: string, status: AutoPartsQuote['status']): Promise<void> {
    return this.repo.updateQuoteStatus(id, workspaceId, status);
  }
}

export class GetAutoPartsQuoteUseCase {
  constructor(private readonly repo: IAutoPartsRepository) {}
  async execute(id: string, workspaceId: string) {
    const quote = await this.repo.findQuoteById(id, workspaceId);
    if (!quote) throw new Error("Orçamento não encontrado.");
    return quote;
  }
}
