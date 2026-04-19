import type { ILeadRepository, CreateLeadDTO, UpdateLeadDTO, LeadFilters } from "@/repositories/lead.repository";

export class GetLeadsUseCase {
  constructor(private readonly repo: ILeadRepository) {}
  execute(workspaceId: string, filters: LeadFilters, page: number, pageSize: number) {
    return this.repo.findAll(workspaceId, filters, page, pageSize);
  }
}

export class CreateLeadUseCase {
  constructor(private readonly repo: ILeadRepository) {}
  execute(data: CreateLeadDTO) {
    return this.repo.create(data);
  }
}

export class UpdateLeadUseCase {
  constructor(private readonly repo: ILeadRepository) {}
  execute(workspaceId: string, id: string, data: UpdateLeadDTO) {
    return this.repo.update(workspaceId, id, data);
  }
}

export class SoftDeleteLeadUseCase {
  constructor(private readonly repo: ILeadRepository) {}
  execute(workspaceId: string, id: string) {
    return this.repo.softDelete(workspaceId, id);
  }
}
