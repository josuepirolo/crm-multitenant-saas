import type { IDealRepository, ContactForSelect } from "@/repositories/deal.repository";
import type { Pipeline, Stage } from "@/types";
import type { DealWithContact } from "@/repositories/deal.repository";
import type { CreateDealInput, UpdateDealInput } from "@/lib/validations/deal";

export class GetKanbanDataUseCase {
  constructor(private readonly repo: IDealRepository) {}

  async execute(workspaceId: string): Promise<{
    pipeline: Pipeline | null;
    stages: Stage[];
    deals: DealWithContact[];
  }> {
    const pipeline = await this.repo.getDefaultPipeline(workspaceId);
    if (!pipeline) return { pipeline: null, stages: [], deals: [] };

    const [stages, deals] = await Promise.all([
      this.repo.getStages(workspaceId, pipeline.id),
      this.repo.getDeals(workspaceId, pipeline.id),
    ]);

    return { pipeline, stages, deals };
  }
}

export class GetContactsForSelectUseCase {
  constructor(private readonly repo: IDealRepository) {}
  execute(workspaceId: string): Promise<ContactForSelect[]> {
    return this.repo.getContactsForSelect(workspaceId);
  }
}

export class CreateDealUseCase {
  constructor(private readonly repo: IDealRepository) {}

  async execute(workspaceId: string, input: CreateDealInput, userId: string): Promise<DealWithContact> {
    const stageValid = await this.repo.validateStageOwnership(workspaceId, input.stage_id);
    if (!stageValid) throw new Error("Stage inválido para este workspace.");

    if (input.contact_id) {
      const contactValid = await this.repo.validateContactOwnership(workspaceId, input.contact_id);
      if (!contactValid) throw new Error("Contato inválido para este workspace.");
    }

    return this.repo.create(workspaceId, input, userId);
  }
}

export class UpdateDealUseCase {
  constructor(private readonly repo: IDealRepository) {}

  async execute(workspaceId: string, dealId: string, input: UpdateDealInput): Promise<DealWithContact> {
    if (input.contact_id) {
      const contactValid = await this.repo.validateContactOwnership(workspaceId, input.contact_id);
      if (!contactValid) throw new Error("Contato inválido para este workspace.");
    }
    return this.repo.update(workspaceId, dealId, input);
  }
}

export class MoveDealUseCase {
  constructor(private readonly repo: IDealRepository) {}

  async execute(workspaceId: string, dealId: string, stageId: string, position: number): Promise<void> {
    const stageValid = await this.repo.validateStageOwnership(workspaceId, stageId);
    if (!stageValid) throw new Error("Stage inválido para este workspace.");
    await this.repo.move(workspaceId, dealId, stageId, position);
  }
}

export class CloseDealUseCase {
  constructor(private readonly repo: IDealRepository) {}
  execute(workspaceId: string, dealId: string, status: "won" | "lost"): Promise<void> {
    return this.repo.close(workspaceId, dealId, status);
  }
}

export class ArchiveDealUseCase {
  constructor(private readonly repo: IDealRepository) {}
  execute(workspaceId: string, dealId: string): Promise<void> {
    return this.repo.archive(workspaceId, dealId);
  }
}

export class CreateDefaultPipelineUseCase {
  constructor(private readonly repo: IDealRepository) {}
  execute(workspaceId: string) {
    return this.repo.createDefaultPipeline(workspaceId);
  }
}
