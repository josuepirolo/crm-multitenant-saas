import {
  waBackendFetch,
  waBackendUpload,
  WaBackendHttpError,
} from "@/lib/wa-backend/client";
import type {
  WaInstance,
  WaInstanceLiveStatus,
  WaInstanceQrCode,
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
  WaMediaUpload,
} from "@/types";

/**
 * Repository do backend WhatsApp (BFF — ADR-006). Tipado contra os contratos em
 * backend_zapi/frontend/wa-backend-integration-contracts.md (management-instances).
 *
 * Não conhece RBAC nem workspace: recebe sempre o `accessToken` (JWT do usuário,
 * resolvido na Server Action) e os ids já validados. A autorização final é do
 * backend WA (gate por papel) — este repo só transporta.
 */
export interface IWaManagementRepository {
  listInstances(tenantId: string, accessToken: string): Promise<WaInstance[]>;
  getStatus(instanceId: string, accessToken: string): Promise<WaInstanceLiveStatus>;
  /** Retorna o QR ou `{ alreadyConnected: true }` quando o backend responde 409. */
  getQrCode(
    instanceId: string,
    accessToken: string
  ): Promise<{ alreadyConnected: false; qr: WaInstanceQrCode } | { alreadyConnected: true }>;
  restart(instanceId: string, accessToken: string): Promise<void>;
  disconnect(instanceId: string, accessToken: string): Promise<void>;
  // account-settings (v2.3) — base /tenants/{tenantId}/instances/{instanceId}
  getProfile(tenantId: string, instanceId: string, accessToken: string): Promise<WaProfile>;
  updateProfileField(
    tenantId: string,
    instanceId: string,
    field: WaProfileField,
    value: string,
    accessToken: string
  ): Promise<WaApplied>;
  getPrivacy(tenantId: string, instanceId: string, accessToken: string): Promise<WaPrivacySettings>;
  // privacidade — edição (v2.3b)
  updateVisibility(
    tenantId: string,
    instanceId: string,
    setting: WaVisibilitySetting,
    visualizationType: WaVisualizationType,
    contactsBlacklist: WaBlacklistOp[] | undefined,
    accessToken: string
  ): Promise<WaApplied>;
  updateGroupAdd(
    tenantId: string,
    instanceId: string,
    type: WaVisualizationType,
    contactsBlacklist: WaBlacklistOp[] | undefined,
    accessToken: string
  ): Promise<WaApplied>;
  updateReadReceipts(tenantId: string, instanceId: string, value: WaReadReceiptsValue, accessToken: string): Promise<WaApplied>;
  updateMessagesDuration(tenantId: string, instanceId: string, value: WaMessagesDurationValue, accessToken: string): Promise<WaApplied>;
  getDisallowedContacts(tenantId: string, instanceId: string, type: WaDisallowedType, accessToken: string): Promise<WaDisallowedContacts>;
  uploadMedia(tenantId: string, form: FormData, accessToken: string): Promise<WaMediaUpload>;
}

export class WaBackendManagementRepository implements IWaManagementRepository {
  async listInstances(tenantId: string, accessToken: string): Promise<WaInstance[]> {
    return waBackendFetch<WaInstance[]>({
      path: `/management/tenants/${tenantId}/instances`,
      accessToken,
    });
  }

  async getStatus(instanceId: string, accessToken: string): Promise<WaInstanceLiveStatus> {
    return waBackendFetch<WaInstanceLiveStatus>({
      path: `/management/instances/${instanceId}/status`,
      accessToken,
    });
  }

  async getQrCode(
    instanceId: string,
    accessToken: string
  ): Promise<{ alreadyConnected: false; qr: WaInstanceQrCode } | { alreadyConnected: true }> {
    try {
      const qr = await waBackendFetch<WaInstanceQrCode>({
        path: `/management/instances/${instanceId}/qrcode`,
        accessToken,
      });
      return { alreadyConnected: false, qr };
    } catch (err) {
      // 409 = instância já conectada (sem QR) → sinal para fechar o dialog.
      if (err instanceof WaBackendHttpError && err.status === 409) {
        return { alreadyConnected: true };
      }
      throw err;
    }
  }

  async restart(instanceId: string, accessToken: string): Promise<void> {
    await waBackendFetch<{ ok: boolean; instance_id: string }>({
      path: `/management/instances/${instanceId}/restart`,
      method: "POST",
      accessToken,
    });
  }

  async disconnect(instanceId: string, accessToken: string): Promise<void> {
    await waBackendFetch<{ ok: boolean; instance_id: string }>({
      path: `/management/instances/${instanceId}/disconnect`,
      method: "POST",
      accessToken,
    });
  }

  // ── account-settings ───────────────────────────────────────────────────────

  async getProfile(tenantId: string, instanceId: string, accessToken: string): Promise<WaProfile> {
    return waBackendFetch<WaProfile>({
      path: `/tenants/${tenantId}/instances/${instanceId}/profile`,
      accessToken,
    });
  }

  async updateProfileField(
    tenantId: string,
    instanceId: string,
    field: WaProfileField,
    value: string,
    accessToken: string
  ): Promise<WaApplied> {
    return waBackendFetch<WaApplied>({
      path: `/tenants/${tenantId}/instances/${instanceId}/profile/${field}`,
      method: "PUT",
      accessToken,
      body: { value },
    });
  }

  async getPrivacy(tenantId: string, instanceId: string, accessToken: string): Promise<WaPrivacySettings> {
    return waBackendFetch<WaPrivacySettings>({
      path: `/tenants/${tenantId}/instances/${instanceId}/privacy`,
      accessToken,
    });
  }

  private base(tenantId: string, instanceId: string) {
    return `/tenants/${tenantId}/instances/${instanceId}`;
  }

  async updateVisibility(
    tenantId: string,
    instanceId: string,
    setting: WaVisibilitySetting,
    visualizationType: WaVisualizationType,
    contactsBlacklist: WaBlacklistOp[] | undefined,
    accessToken: string
  ): Promise<WaApplied> {
    return waBackendFetch<WaApplied>({
      path: `${this.base(tenantId, instanceId)}/privacy/${setting}`,
      method: "PUT",
      accessToken,
      body: { visualizationType, ...(contactsBlacklist ? { contactsBlacklist } : {}) },
    });
  }

  async updateGroupAdd(
    tenantId: string,
    instanceId: string,
    type: WaVisualizationType,
    contactsBlacklist: WaBlacklistOp[] | undefined,
    accessToken: string
  ): Promise<WaApplied> {
    // group-add usa a chave `type` em vez de `visualizationType` (peculiaridade Z-API).
    return waBackendFetch<WaApplied>({
      path: `${this.base(tenantId, instanceId)}/privacy/group-add`,
      method: "PUT",
      accessToken,
      body: { type, ...(contactsBlacklist ? { contactsBlacklist } : {}) },
    });
  }

  async updateReadReceipts(tenantId: string, instanceId: string, value: WaReadReceiptsValue, accessToken: string): Promise<WaApplied> {
    return waBackendFetch<WaApplied>({
      path: `${this.base(tenantId, instanceId)}/privacy/read-receipts`,
      method: "PUT",
      accessToken,
      body: { value },
    });
  }

  async updateMessagesDuration(tenantId: string, instanceId: string, value: WaMessagesDurationValue, accessToken: string): Promise<WaApplied> {
    return waBackendFetch<WaApplied>({
      path: `${this.base(tenantId, instanceId)}/privacy/messages-duration`,
      method: "PUT",
      accessToken,
      body: { value },
    });
  }

  async getDisallowedContacts(tenantId: string, instanceId: string, type: WaDisallowedType, accessToken: string): Promise<WaDisallowedContacts> {
    return waBackendFetch<WaDisallowedContacts>({
      path: `${this.base(tenantId, instanceId)}/privacy/disallowed-contacts?type=${type}`,
      accessToken,
    });
  }

  async uploadMedia(tenantId: string, form: FormData, accessToken: string): Promise<WaMediaUpload> {
    return waBackendUpload<WaMediaUpload>({
      path: `/tenants/${tenantId}/media/uploads`,
      accessToken,
      form,
    });
  }
}
