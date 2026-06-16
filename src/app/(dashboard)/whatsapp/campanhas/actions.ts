"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { authorizeWaOperation, mapWaError, uuid, INVALID } from "../_helpers";
import { WaBackendOperationalRepository } from "@/repositories/wa-operational.repository";
import {
  ListWaCampaignsUseCase,
  CreateWaCampaignUseCase,
  SetWaCampaignAudienceUseCase,
  LaunchWaCampaignUseCase,
  PauseWaCampaignUseCase,
  ResumeWaCampaignUseCase,
  CancelWaCampaignUseCase,
} from "@/usecases/WaOperationalUseCases";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import type { WaCampaign, WaCampaignLaunched, WaCampaignLifecycle, WaCampaignAudienceResult } from "@/types";

const repo = () => new WaBackendOperationalRepository();

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function listWaCampaigns(
  tenantId: string,
  instanceId: string,
  limit = 20,
  offset = 0
): Promise<{ error?: string; items: WaCampaign[]; total: number }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "view");
  if ("error" in auth) return { error: auth.error, items: [], total: 0 };
  try {
    const result = await new ListWaCampaignsUseCase(repo()).execute(tenantId, auth.token, limit, offset);
    return { items: result.items, total: result.total };
  } catch (err) {
    return { error: mapWaError(err), items: [], total: 0 };
  }
}

// ── Criar campanha (rascunho) ─────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().trim().min(1, "Nome da campanha é obrigatório.").max(150),
  type: z.enum(["text", "image", "audio", "video", "document"]),
  instanceId: z.string().uuid("ID de instância inválido."),
  text: z.string().trim().max(4096).optional(),
  media_url: z.string().url("URL de mídia inválida.").optional(),
  caption: z.string().trim().max(1024).optional(),
  filename: z.string().trim().max(255).optional(),
}).refine((d) => d.type !== "text" || (d.text && d.text.length > 0), {
  message: "Texto da campanha é obrigatório.",
  path: ["text"],
}).refine((d) => d.type === "text" || (d.media_url && d.media_url.length > 0), {
  message: "URL de mídia obrigatória para este tipo.",
  path: ["media_url"],
});

export async function createWaCampaign(
  tenantId: string,
  instanceId: string,
  payload: {
    name: string;
    type: string;
    text?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
  }
): Promise<{ error?: string; campaign?: WaCampaign }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };

  const parsed = createSchema.safeParse({ ...payload, instanceId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const campaign = await new CreateWaCampaignUseCase(repo()).execute(
      tenantId,
      {
        name: parsed.data.name,
        type: parsed.data.type as WaCampaign["type"],
        instance_id: instanceId,
        text: parsed.data.text,
        media_url: parsed.data.media_url,
        caption: parsed.data.caption,
        filename: parsed.data.filename,
      },
      auth.token
    );
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_CAMPAIGN_CREATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_campaign",
      entity_id: campaign.campaign_id,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, name: parsed.data.name, type: parsed.data.type, source: "user" },
    });
    revalidatePath("/whatsapp/campanhas");
    return { campaign };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── Audiência (phones) ────────────────────────────────────────────────────────

const phoneRe = /^\d{10,15}$/;

export async function setWaCampaignAudience(
  tenantId: string,
  instanceId: string,
  campaignId: string,
  phones: string[]
): Promise<{ error?: string; result?: WaCampaignAudienceResult }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  if (!uuid.safeParse(campaignId).success) return { error: INVALID };
  if (!phones.length || phones.some((p) => !phoneRe.test(p))) {
    return { error: "Informe ao menos um telefone válido (somente dígitos, 10-15 chars)." };
  }
  try {
    const result = await new SetWaCampaignAudienceUseCase(repo()).execute(
      tenantId, campaignId, { phones }, auth.token
    );
    revalidatePath("/whatsapp/campanhas");
    return { result };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────

async function lifecycleAction(
  tenantId: string,
  instanceId: string,
  campaignId: string,
  action: "launch" | "pause" | "resume" | "cancel"
): Promise<{ error?: string; result?: WaCampaignLaunched | WaCampaignLifecycle }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  if (!uuid.safeParse(campaignId).success) return { error: INVALID };

  try {
    let result: WaCampaignLaunched | WaCampaignLifecycle;
    const r = repo();
    if (action === "launch") {
      result = await new LaunchWaCampaignUseCase(r).execute(tenantId, campaignId, auth.token);
    } else if (action === "pause") {
      result = await new PauseWaCampaignUseCase(r).execute(tenantId, campaignId, auth.token);
    } else if (action === "resume") {
      result = await new ResumeWaCampaignUseCase(r).execute(tenantId, campaignId, auth.token);
    } else {
      result = await new CancelWaCampaignUseCase(r).execute(tenantId, campaignId, auth.token);
    }

    const auditAction =
      action === "launch" ? AUDIT_ACTIONS.WA_CAMPAIGN_LAUNCHED :
      action === "pause"  ? AUDIT_ACTIONS.WA_CAMPAIGN_PAUSED   :
                            AUDIT_ACTIONS.WA_CAMPAIGN_CANCELLED;
    if (action !== "resume") {
      await createAuditLog({
        action: auditAction,
        workspace_id: auth.workspaceId,
        user_id: auth.userId,
        entity_type: "wa_campaign",
        entity_id: campaignId,
        ip_address: await getClientIp(),
        metadata: { tenant_id: tenantId, source: "user" },
      });
    }
    revalidatePath("/whatsapp/campanhas");
    return { result };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function launchWaCampaign(t: string, i: string, c: string) { return lifecycleAction(t, i, c, "launch"); }
export async function pauseWaCampaign(t: string, i: string, c: string) { return lifecycleAction(t, i, c, "pause"); }
export async function resumeWaCampaign(t: string, i: string, c: string) { return lifecycleAction(t, i, c, "resume"); }
export async function cancelWaCampaign(t: string, i: string, c: string) { return lifecycleAction(t, i, c, "cancel"); }
