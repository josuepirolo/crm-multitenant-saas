import type { IWaOperationalRepository, CreateGroupDTO, CreateCampaignDTO, SetAudienceByPhonesDTO } from "@/repositories/wa-operational.repository";
import type {
  WaConversation,
  WaSendMessageBody,
  WaCampaign,
  WaCampaignAudienceResult,
  WaCampaignLaunched,
  WaCampaignLifecycle,
  WaGroupCreated,
  WaGroupReadiness,
  WaGroupApplied,
  WaMessageSent,
} from "@/types";

// ── §6.1 — Grupos (via conversations?is_group=true) ──────────────────────────

export class ListWaGroupsUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, accessToken: string, limit = 50, offset = 0): Promise<WaConversation[]> {
    const page = await this.repo.listConversations(tenantId, { is_group: true, limit, offset }, accessToken);
    return page.data;
  }
}

// ── §4 — Grupos (mutações) ────────────────────────────────────────────────────

export class CreateWaGroupUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, instanceId: string, dto: CreateGroupDTO, accessToken: string): Promise<WaGroupCreated> {
    return this.repo.createGroup(tenantId, instanceId, dto, accessToken);
  }
}

export class GetWaGroupReadinessUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, instanceId: string, groupId: string, accessToken: string): Promise<WaGroupReadiness> {
    return this.repo.getGroupReadiness(tenantId, instanceId, groupId, accessToken);
  }
}

export class UpdateWaGroupNameUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, instanceId: string, groupId: string, value: string, accessToken: string): Promise<WaGroupApplied> {
    return this.repo.updateGroupName(tenantId, instanceId, groupId, value, accessToken);
  }
}

export class UpdateWaGroupDescriptionUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, instanceId: string, groupId: string, value: string, accessToken: string): Promise<WaGroupApplied> {
    return this.repo.updateGroupDescription(tenantId, instanceId, groupId, value, accessToken);
  }
}

export class AddWaGroupParticipantsUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, instanceId: string, groupId: string, phones: string[], accessToken: string): Promise<WaGroupApplied> {
    return this.repo.addParticipants(tenantId, instanceId, groupId, phones, accessToken);
  }
}

export class RemoveWaGroupParticipantsUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, instanceId: string, groupId: string, phones: string[], accessToken: string): Promise<WaGroupApplied> {
    return this.repo.removeParticipants(tenantId, instanceId, groupId, phones, accessToken);
  }
}

// ── §5 — Envio avulso ─────────────────────────────────────────────────────────

export class SendWaMessageUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, instanceId: string, body: WaSendMessageBody, accessToken: string): Promise<WaMessageSent> {
    if (body.type === "text" && (!body.text || !body.text.trim())) {
      throw new Error("Texto da mensagem não pode ser vazio.");
    }
    return this.repo.sendMessage(tenantId, instanceId, body, accessToken);
  }
}

// ── §7 — Campanhas ────────────────────────────────────────────────────────────

export class ListWaCampaignsUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, accessToken: string, limit = 20, offset = 0): Promise<{ items: WaCampaign[]; total: number }> {
    const page = await this.repo.listCampaigns(tenantId, { limit, offset }, accessToken);
    return { items: page.items, total: page.total };
  }
}

export class CreateWaCampaignUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, dto: CreateCampaignDTO, accessToken: string): Promise<WaCampaign> {
    return this.repo.createCampaign(tenantId, dto, accessToken);
  }
}

export class SetWaCampaignAudienceUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}

  async execute(tenantId: string, campaignId: string, dto: SetAudienceByPhonesDTO, accessToken: string): Promise<WaCampaignAudienceResult> {
    if (!dto.phones.length) throw new Error("Selecione ao menos um destinatário.");
    return this.repo.setAudienceByPhones(tenantId, campaignId, dto, accessToken);
  }
}

export class LaunchWaCampaignUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLaunched> {
    return this.repo.launchCampaign(tenantId, campaignId, accessToken);
  }
}

export class PauseWaCampaignUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLifecycle> {
    return this.repo.pauseCampaign(tenantId, campaignId, accessToken);
  }
}

export class ResumeWaCampaignUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLifecycle> {
    return this.repo.resumeCampaign(tenantId, campaignId, accessToken);
  }
}

export class CancelWaCampaignUseCase {
  constructor(private readonly repo: IWaOperationalRepository) {}
  async execute(tenantId: string, campaignId: string, accessToken: string): Promise<WaCampaignLifecycle> {
    return this.repo.cancelCampaign(tenantId, campaignId, accessToken);
  }
}
