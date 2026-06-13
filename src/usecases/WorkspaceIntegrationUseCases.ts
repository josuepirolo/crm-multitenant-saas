import type {
  IWorkspaceIntegrationRepository,
  CreateWorkspaceIntegrationDTO,
  UpdateWorkspaceIntegrationDTO,
} from "@/repositories/workspace-integration.repository";
import type {
  WorkspaceIntegration,
  WorkspaceIntegrationWithWaTenant,
  WaTenantOption,
  WaProviderOption,
} from "@/types";

export class ListWorkspaceIntegrationsUseCase {
  constructor(private readonly repo: IWorkspaceIntegrationRepository) {}
  async execute(workspaceId: string): Promise<WorkspaceIntegrationWithWaTenant[]> {
    return this.repo.listByWorkspace(workspaceId);
  }
}

export class ListAvailableWaTenantsUseCase {
  constructor(private readonly repo: IWorkspaceIntegrationRepository) {}
  async execute(): Promise<WaTenantOption[]> {
    return this.repo.listAvailableWaTenants();
  }
}

export class ListWaProvidersUseCase {
  constructor(private readonly repo: IWorkspaceIntegrationRepository) {}
  async execute(): Promise<WaProviderOption[]> {
    return this.repo.listProviders();
  }
}

export class LinkWaTenantUseCase {
  constructor(private readonly repo: IWorkspaceIntegrationRepository) {}
  async execute(dto: CreateWorkspaceIntegrationDTO): Promise<WorkspaceIntegration> {
    return this.repo.create(dto);
  }
}

export class UpdateWorkspaceIntegrationUseCase {
  constructor(private readonly repo: IWorkspaceIntegrationRepository) {}
  async execute(id: string, dto: UpdateWorkspaceIntegrationDTO): Promise<void> {
    return this.repo.update(id, dto);
  }
}

export class UnlinkWaTenantUseCase {
  constructor(private readonly repo: IWorkspaceIntegrationRepository) {}
  async execute(id: string): Promise<void> {
    return this.repo.remove(id);
  }
}
