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
  WaVisibilitySetting,
  WaVisualizationType,
  WaBlacklistOp,
  WaReadReceiptsValue,
  WaMessagesDurationValue,
  WaDisallowedType,
  WaDisallowedContacts,
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

// privacidade — edição (v2.3b)

export class UpdateWaVisibilityUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(
    tenantId: string,
    instanceId: string,
    setting: WaVisibilitySetting,
    visualizationType: WaVisualizationType,
    contactsBlacklist: WaBlacklistOp[] | undefined,
    accessToken: string
  ): Promise<WaApplied> {
    return this.waRepo.updateVisibility(tenantId, instanceId, setting, visualizationType, contactsBlacklist, accessToken);
  }
}

export class UpdateWaGroupAddUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(
    tenantId: string,
    instanceId: string,
    type: WaVisualizationType,
    contactsBlacklist: WaBlacklistOp[] | undefined,
    accessToken: string
  ): Promise<WaApplied> {
    return this.waRepo.updateGroupAdd(tenantId, instanceId, type, contactsBlacklist, accessToken);
  }
}

export class UpdateWaReadReceiptsUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(tenantId: string, instanceId: string, value: WaReadReceiptsValue, accessToken: string): Promise<WaApplied> {
    return this.waRepo.updateReadReceipts(tenantId, instanceId, value, accessToken);
  }
}

export class UpdateWaMessagesDurationUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(tenantId: string, instanceId: string, value: WaMessagesDurationValue, accessToken: string): Promise<WaApplied> {
    return this.waRepo.updateMessagesDuration(tenantId, instanceId, value, accessToken);
  }
}

export class GetWaDisallowedContactsUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(tenantId: string, instanceId: string, type: WaDisallowedType, accessToken: string): Promise<WaDisallowedContacts> {
    return this.waRepo.getDisallowedContacts(tenantId, instanceId, type, accessToken);
  }
}

/**
 * Upload de foto de perfil: envia a mídia (multipart) e aplica o caminho
 * retornado em PUT .../profile/picture. Resolve as chaves possíveis da resposta
 * de mídia (media_url/file_path/path/url) de forma defensiva.
 */
export class UploadWaProfilePictureUseCase {
  constructor(private readonly waRepo: IWaManagementRepository) {}
  async execute(tenantId: string, instanceId: string, form: FormData, accessToken: string): Promise<WaApplied> {
    const media = await this.waRepo.uploadMedia(tenantId, form, accessToken);
    const value = media.media_url ?? media.file_path ?? media.path ?? media.url;
    if (!value) throw new Error("Resposta de upload de mídia sem caminho utilizável.");
    return this.waRepo.updateProfileField(tenantId, instanceId, "picture", value, accessToken);
  }
}
