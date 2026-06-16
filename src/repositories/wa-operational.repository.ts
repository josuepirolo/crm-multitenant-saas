import { waBackendFetch } from "@/lib/wa-backend/client";
import type {
  WaConversationsPage,
  WaConversationStatus,
  WaGroupCreated,
  WaGroupApplied,
  WaGroupReadiness,
  WaSendMessageBody,
  WaMessageSent,
  WaCampaignType,
  WaCampaign,
  WaCampaignsPage,
  WaCampaignAudienceResult,
  WaCampaignLaunched,
  WaCampaignLifecycle,
  WaCampaignStatus,
} from "@/types";

/**
 * Repository BFF para os módulos operacionais do console WhatsApp (ADR-008 fases 2–4).
 * Contratos: backend_zapi/frontend/wa-backend-integration-contracts.md §4–§7.
 * Invariantes herdadas de ADR-001/006: nunca escreve em wa_*, nunca expõe credentials.
 */

// ── Filtros de listagem ────────────────────────────────────────────────────────

export interface ListConversationsFilter {
  is_group?: boolean;
  status?: WaConversationStatus;
  limit?: number;
  offset?: number;
}

export interface ListCampaignsFilter {
  status?: WaCampaignStatus;
  limit?: number;
  offset?: number;
}

// ── DTO de criação de grupo ────────────────────────────────────────────────────

export interface CreateGroupDTO {
  groupName: string;
  phones: string[];
  autoInvite?: boolean;
}

// ── DTO de criação de campanha ─────────────────────────────────────────────────

export interface CreateCampaignDTO {
  name: string;
  type: WaCampaignType;
  instance_id: string;
  text?: string;
  media_url?: string;
  caption?: string;
  filename?: string;
  scheduled_at?: string | null;
}

// ── DTO de audiência por filtro (phones do CRM) ───────────────────────────────

export interface SetAudienceByPhonesDTO {
  phones: string[];
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IWaOperationalRepository {
  // §6.1 — conversas (grupos via is_group=true)
  listConversations(
    tenantId: string,
    filter: ListConversationsFilter,
    accessToken: string
  ): Promise<WaConversationsPage>;

  // §4 — grupos
  createGroup(
    tenantId: string,
    instanceId: string,
    dto: CreateGroupDTO,
    accessToken: string
  ): Promise<WaGroupCreated>;
  getGroupReadiness(
    tenantId: string,
    instanceId: string,
    groupId: string,
    accessToken: string
  ): Promise<WaGroupReadiness>;
  updateGroupName(
    tenantId: string,
    instanceId: string,
    groupId: string,
    value: string,
    accessToken: string
  ): Promise<WaGroupApplied>;
  updateGroupDescription(
    tenantId: string,
    instanceId: string,
    groupId: string,
    value: string,
    accessToken: string
  ): Promise<WaGroupApplied>;
  addParticipants(
    tenantId: string,
    instanceId: string,
    groupId: string,
    phones: string[],
    accessToken: string
  ): Promise<WaGroupApplied>;
  removeParticipants(
    tenantId: string,
    instanceId: string,
    groupId: string,
    phones: string[],
    accessToken: string
  ): Promise<WaGroupApplied>;
  addAdmins(
    tenantId: string,
    instanceId: string,
    groupId: string,
    phones: string[],
    accessToken: string
  ): Promise<WaGroupApplied>;
  removeAdmins(
    tenantId: string,
    instanceId: string,
    groupId: string,
    phones: string[],
    accessToken: string
  ): Promise<WaGroupApplied>;

  // §5 — envio avulso
  sendMessage(
    tenantId: string,
    instanceId: string,
    body: WaSendMessageBody,
    accessToken: string
  ): Promise<WaMessageSent>;

  // §7 — campanhas
  listCampaigns(
    tenantId: string,
    filter: ListCampaignsFilter,
    accessToken: string
  ): Promise<WaCampaignsPage>;
  getCampaign(
    tenantId: string,
    campaignId: string,
    accessToken: string
  ): Promise<WaCampaign>;
  createCampaign(
    tenantId: string,
    dto: CreateCampaignDTO,
    accessToken: string
  ): Promise<WaCampaign>;
  setAudienceByPhones(
    tenantId: string,
    campaignId: string,
    dto: SetAudienceByPhonesDTO,
    accessToken: string
  ): Promise<WaCampaignAudienceResult>;
  launchCampaign(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLaunched>;
  pauseCampaign(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLifecycle>;
  resumeCampaign(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLifecycle>;
  cancelCampaign(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLifecycle>;
}

// ── Implementação ─────────────────────────────────────────────────────────────

export class WaBackendOperationalRepository implements IWaOperationalRepository {

  // §6.1
  async listConversations(
    tenantId: string,
    filter: ListConversationsFilter,
    accessToken: string
  ): Promise<WaConversationsPage> {
    const params = new URLSearchParams();
    if (filter.is_group !== undefined) params.set("is_group", String(filter.is_group));
    if (filter.status) params.set("status", filter.status);
    if (filter.limit) params.set("limit", String(filter.limit));
    if (filter.offset) params.set("offset", String(filter.offset));
    const qs = params.toString();
    return waBackendFetch<WaConversationsPage>({
      path: `/api/tenants/${tenantId}/conversations${qs ? `?${qs}` : ""}`,
      accessToken,
    });
  }

  // §4 grupos
  private groupBase(tenantId: string, instanceId: string) {
    return `/tenants/${tenantId}/instances/${instanceId}/groups`;
  }

  async createGroup(
    tenantId: string,
    instanceId: string,
    dto: CreateGroupDTO,
    accessToken: string
  ): Promise<WaGroupCreated> {
    return waBackendFetch<WaGroupCreated>({
      path: this.groupBase(tenantId, instanceId),
      method: "POST",
      accessToken,
      body: { groupName: dto.groupName, phones: dto.phones, autoInvite: dto.autoInvite ?? true },
      timeoutMs: 30_000, // criação envolve Z-API — mais lento que leitura
    });
  }

  async getGroupReadiness(
    tenantId: string,
    instanceId: string,
    groupId: string,
    accessToken: string
  ): Promise<WaGroupReadiness> {
    return waBackendFetch<WaGroupReadiness>({
      path: `${this.groupBase(tenantId, instanceId)}/${groupId}/readiness`,
      accessToken,
    });
  }

  async updateGroupName(
    tenantId: string,
    instanceId: string,
    groupId: string,
    value: string,
    accessToken: string
  ): Promise<WaGroupApplied> {
    return waBackendFetch<WaGroupApplied>({
      path: `${this.groupBase(tenantId, instanceId)}/${groupId}/name`,
      method: "PUT",
      accessToken,
      body: { value },
    });
  }

  async updateGroupDescription(
    tenantId: string,
    instanceId: string,
    groupId: string,
    value: string,
    accessToken: string
  ): Promise<WaGroupApplied> {
    return waBackendFetch<WaGroupApplied>({
      path: `${this.groupBase(tenantId, instanceId)}/${groupId}/description`,
      method: "PUT",
      accessToken,
      body: { value },
    });
  }

  private async participantAction(
    tenantId: string,
    instanceId: string,
    groupId: string,
    sub: string,
    method: "POST" | "DELETE",
    phones: string[],
    accessToken: string
  ): Promise<WaGroupApplied> {
    return waBackendFetch<WaGroupApplied>({
      path: `${this.groupBase(tenantId, instanceId)}/${groupId}/${sub}`,
      method,
      accessToken,
      body: { phones },
    });
  }

  async addParticipants(t: string, i: string, g: string, phones: string[], token: string) {
    return this.participantAction(t, i, g, "participants", "POST", phones, token);
  }
  async removeParticipants(t: string, i: string, g: string, phones: string[], token: string) {
    return this.participantAction(t, i, g, "participants", "DELETE", phones, token);
  }
  async addAdmins(t: string, i: string, g: string, phones: string[], token: string) {
    return this.participantAction(t, i, g, "admins", "POST", phones, token);
  }
  async removeAdmins(t: string, i: string, g: string, phones: string[], token: string) {
    return this.participantAction(t, i, g, "admins", "DELETE", phones, token);
  }

  // §5 — envio avulso
  async sendMessage(
    tenantId: string,
    instanceId: string,
    body: WaSendMessageBody,
    accessToken: string
  ): Promise<WaMessageSent> {
    return waBackendFetch<WaMessageSent>({
      path: `/api/tenants/${tenantId}/instances/${instanceId}/messages`,
      method: "POST",
      accessToken,
      body,
    });
  }

  // §7 campanhas
  private campaignBase(tenantId: string) {
    return `/api/tenants/${tenantId}/campaigns`;
  }

  async listCampaigns(
    tenantId: string,
    filter: ListCampaignsFilter,
    accessToken: string
  ): Promise<WaCampaignsPage> {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    params.set("limit", String(filter.limit ?? 20));
    params.set("offset", String(filter.offset ?? 0));
    return waBackendFetch<WaCampaignsPage>({
      path: `${this.campaignBase(tenantId)}?${params.toString()}`,
      accessToken,
    });
  }

  async getCampaign(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaign> {
    return waBackendFetch<WaCampaign>({
      path: `${this.campaignBase(tenantId)}/${campaignId}`,
      accessToken,
    });
  }

  async createCampaign(tenantId: string, dto: CreateCampaignDTO, accessToken: string): Promise<WaCampaign> {
    return waBackendFetch<WaCampaign>({
      path: this.campaignBase(tenantId),
      method: "POST",
      accessToken,
      body: dto,
    });
  }

  async setAudienceByPhones(
    tenantId: string,
    campaignId: string,
    dto: SetAudienceByPhonesDTO,
    accessToken: string
  ): Promise<WaCampaignAudienceResult> {
    return waBackendFetch<WaCampaignAudienceResult>({
      path: `${this.campaignBase(tenantId)}/${campaignId}/audience`,
      method: "PUT",
      accessToken,
      body: { audience_type: "filter", filter: { phones: dto.phones } },
    });
  }

  private async lifecycleAction(
    tenantId: string,
    campaignId: string,
    action: string,
    accessToken: string
  ): Promise<WaCampaignLifecycle> {
    return waBackendFetch<WaCampaignLifecycle>({
      path: `${this.campaignBase(tenantId)}/${campaignId}/${action}`,
      method: "POST",
      accessToken,
    });
  }

  async launchCampaign(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLaunched> {
    return waBackendFetch<WaCampaignLaunched>({
      path: `${this.campaignBase(tenantId)}/${campaignId}/launch`,
      method: "POST",
      accessToken,
    });
  }
  async pauseCampaign(t: string, c: string, token: string) { return this.lifecycleAction(t, c, "pause", token); }
  async resumeCampaign(t: string, c: string, token: string) { return this.lifecycleAction(t, c, "resume", token); }
  async cancelCampaign(t: string, c: string, token: string) { return this.lifecycleAction(t, c, "cancel", token); }
}
