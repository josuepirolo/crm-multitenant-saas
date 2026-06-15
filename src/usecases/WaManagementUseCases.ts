import type { IWaManagementRepository } from "@/repositories/wa-management.repository";
import type { IWorkspaceIntegrationRepository } from "@/repositories/workspace-integration.repository";
import type {
  WaInstanceLiveStatus,
  WaInstanceQrCode,
  WaInstanceWithTenant,
  WaProfile,
  WaProfileField,
  WaApplied,
  WaPrivacySettings,
} from "@/types";

/**
 * Lista todas as instâncias WhatsApp do workspace: resolve os vínculos
 * (workspace_integrations → wa_tenant_id + label) e, para cada tenant, busca as
 * instâncias no backend WA, atando `tenant_id` e `integration_label`.
 * Falha de um tenant isolado não derruba os demais (Promise.allSettled).
 */
export class ListWorkspaceWaInstancesUseCase {
  constructor(
    private readonly waRepo: IWaManagementRepository,
    private readonly linkRepo: IWorkspaceIntegrationRepository
  ) {}

  async execute(workspaceId: string, accessToken: string): Promise<WaInstanceWithTenant[]> {
    const links = await this.linkRepo.listWaTenantLinksByWorkspace(workspaceId);
    if (links.length === 0) return [];

    const results = await Promise.allSettled(
      links.map(async (link) => {
        const instances = await this.waRepo.listInstances(link.wa_tenant_id, accessToken);
        return instances.map<WaInstanceWithTenant>((inst) => ({
          ...inst,
          tenant_id: link.wa_tenant_id,
          integration_label: link.label,
        }));
      })
    );

    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  }
}

export class GetWaInstanceStatusUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(instanceId: string, accessToken: string): Promise<WaInstanceLiveStatus> {
    return this.waRepo.getStatus(instanceId, accessToken);
  }
}

export class GetWaInstanceQrCodeUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(
    instanceId: string,
    accessToken: string
  ): Promise<{ alreadyConnected: false; qr: WaInstanceQrCode } | { alreadyConnected: true }> {
    return this.waRepo.getQrCode(instanceId, accessToken);
  }
}

export class RestartWaInstanceUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(instanceId: string, accessToken: string): Promise<void> {
    return this.waRepo.restart(instanceId, accessToken);
  }
}

export class DisconnectWaInstanceUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(instanceId: string, accessToken: string): Promise<void> {
    return this.waRepo.disconnect(instanceId, accessToken);
  }
}

// ── account-settings (v2.3) ─────────────────────────────────────────────────

export class GetWaProfileUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(tenantId: string, instanceId: string, accessToken: string): Promise<WaProfile> {
    return this.waRepo.getProfile(tenantId, instanceId, accessToken);
  }
}

export class UpdateWaProfileFieldUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(
    tenantId: string,
    instanceId: string,
    field: WaProfileField,
    value: string,
    accessToken: string
  ): Promise<WaApplied> {
    return this.waRepo.updateProfileField(tenantId, instanceId, field, value, accessToken);
  }
}

export class GetWaPrivacyUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(tenantId: string, instanceId: string, accessToken: string): Promise<WaPrivacySettings> {
    return this.waRepo.getPrivacy(tenantId, instanceId, accessToken);
  }
}
