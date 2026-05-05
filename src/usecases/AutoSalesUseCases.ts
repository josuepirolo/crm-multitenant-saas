import type { IAutoSalesRepository, CreateInventoryDTO, CreateProposalDTO, InventoryFilters } from "@/repositories/auto-sales.repository";
import type { AutoSalesInventory, AutoSalesInventoryPricing, AutoSalesOptionalItem, AutoSalesProposal } from "@/types";

export class ListInventoryUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(workspaceId: string, filters?: InventoryFilters): Promise<AutoSalesInventory[]> {
    return this.repo.listInventory(workspaceId, filters);
  }
}

export class GetInventoryItemUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(id: string, workspaceId: string): Promise<AutoSalesInventory> {
    const item = await this.repo.findInventoryById(id, workspaceId);
    if (!item) throw new Error("Veículo não encontrado.");
    return item;
  }
}

export class CreateInventoryItemUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(data: CreateInventoryDTO): Promise<AutoSalesInventory> {
    if (!data.color.trim())          throw new Error("Cor é obrigatória.");
    if (data.year_manufacture < 1900) throw new Error("Ano de fabricação inválido.");
    if (data.year_model < 1900)       throw new Error("Ano do modelo inválido.");
    return this.repo.createInventory(data);
  }
}

export class UpdateInventoryItemUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(id: string, workspaceId: string, data: Partial<CreateInventoryDTO>): Promise<AutoSalesInventory> {
    return this.repo.updateInventory(id, workspaceId, data);
  }
}

export class UpdateInventoryStatusUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(id: string, workspaceId: string, status: AutoSalesInventory['status']): Promise<void> {
    return this.repo.updateStatus(id, workspaceId, status);
  }
}

export class UpsertInventoryPricingUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(data: Omit<AutoSalesInventoryPricing, 'markup_pct' | 'margin_pct' | 'updated_at'> & { workspace_id: string }): Promise<AutoSalesInventoryPricing> {
    if (!data.workspace_id)    throw new Error("Workspace é obrigatório.");
    if (data.cost_price < 0)  throw new Error("Preço de custo não pode ser negativo.");
    if (data.offer_price < 0) throw new Error("Preço de oferta não pode ser negativo.");
    if (data.max_discount_price !== null && data.max_discount_price !== undefined && data.max_discount_price > data.offer_price) {
      throw new Error("Preço mínimo de negociação não pode ser maior que o preço de oferta.");
    }
    return this.repo.upsertPricing(data);
  }
}

export class AddOptionalItemUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(data: Omit<AutoSalesOptionalItem, 'id'>): Promise<AutoSalesOptionalItem> {
    if (!data.name.trim()) throw new Error("Nome do item opcional é obrigatório.");
    return this.repo.addOptional(data);
  }
}

export class RemoveOptionalItemUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(id: string): Promise<void> {
    return this.repo.removeOptional(id);
  }
}

export class CreateProposalUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(data: CreateProposalDTO): Promise<AutoSalesProposal> {
    return this.repo.createProposal(data);
  }
}

export class UpdateProposalStatusUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(id: string, workspaceId: string, status: AutoSalesProposal['status']): Promise<void> {
    return this.repo.updateProposalStatus(id, workspaceId, status);
  }
}

export class ListProposalsUseCase {
  constructor(private readonly repo: IAutoSalesRepository) {}
  async execute(workspaceId: string): Promise<AutoSalesProposal[]> {
    return this.repo.listProposals(workspaceId);
  }
}
