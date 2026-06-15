"use server";

import { z } from "zod";
import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import {
  getUserAccessToken,
  WaBackendNotConfiguredError,
  WaBackendHttpError,
  WaBackendUnreachableError,
} from "@/lib/wa-backend/client";
import { SupabaseWorkspaceIntegrationRepository } from "@/repositories/workspace-integration.repository";
import { WaBackendManagementRepository } from "@/repositories/wa-management.repository";
import {
  ListWorkspaceWaInstancesUseCase,
  GetWaInstanceStatusUseCase,
  GetWaInstanceQrCodeUseCase,
  RestartWaInstanceUseCase,
  DisconnectWaInstanceUseCase,
  GetWaProfileUseCase,
  UpdateWaProfileFieldUseCase,
  GetWaPrivacyUseCase,
  UpdateWaVisibilityUseCase,
  UpdateWaGroupAddUseCase,
  UpdateWaReadReceiptsUseCase,
  UpdateWaMessagesDurationUseCase,
  GetWaDisallowedContactsUseCase,
  UploadWaProfilePictureUseCase,
} from "@/usecases/WaManagementUseCases";
import { createAuditLog, AUDIT_ACTIONS, type AuditAction } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WaInstanceWithTenant,
  WaInstanceLiveStatus,
  WaProfile,
  WaPrivacySettings,
  WaVisibilitySetting,
  WaVisualizationType,
  WaBlacklistOp,
  WaReadReceiptsValue,
  WaMessagesDurationValue,
  WaDisallowedType,
  WaDisallowedContacts,
} from "@/types";

// Mensagens públicas genéricas — nunca vaza corpo/stack/token do backend WA.
const NO_ACCESS = "Sua conta não tem acesso a esta instância WhatsApp. Fale com o suporte.";
const UNAVAILABLE = "Serviço de WhatsApp indisponível no momento. Tente novamente.";
const NOT_CONFIGURED = "Integração WhatsApp ainda não está configurada.";
const INVALID = "Requisição inválida.";

const uuid = z.string().uuid();

/** Traduz erros do backend WA para mensagem pública, logando o real server-side. */
function mapWaError(err: unknown): string {
  const internal = err instanceof Error ? err.message : String(err);
  console.error("[wa-bff]", internal.slice(0, 200));
  if (err instanceof WaBackendNotConfiguredError) return NOT_CONFIGURED;
  if (err instanceof WaBackendHttpError) {
    return err.status === 401 || err.status === 403 ? NO_ACCESS : UNAVAILABLE;
  }
  if (err instanceof WaBackendUnreachableError) return UNAVAILABLE;
  return UNAVAILABLE;
}

/** Defesa anti-IDOR: o tenant pedido tem de pertencer ao workspace autenticado. */
async function tenantBelongsToWorkspace(
  client: SupabaseClient,
  workspaceId: string,
  tenantId: string
): Promise<boolean> {
  const links = await new SupabaseWorkspaceIntegrationRepository(client)
    .listWaTenantLinksByWorkspace(workspaceId);
  return links.some((l) => l.wa_tenant_id === tenantId);
}

// ── Leitura (gate settings:view → owner/admin/manager) ───────────────────────

export async function listWorkspaceWaInstances(): Promise<{
  error?: string;
  instances: WaInstanceWithTenant[];
}> {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error, instances: [] };

  const token = await getUserAccessToken();
  if (!token) return { error: NO_ACCESS, instances: [] };

  try {
    const client = await getScopedSupabaseClient();
    const linkRepo = new SupabaseWorkspaceIntegrationRepository(client);
    const waRepo = new WaBackendManagementRepository();
    const instances = await new ListWorkspaceWaInstancesUseCase(waRepo, linkRepo)
      .execute(ctx.workspaceId, token);
    return { instances };
  } catch (err) {
    return { error: mapWaError(err), instances: [] };
  }
}

export async function getWaInstanceStatus(
  tenantId: string,
  instanceId: string
): Promise<{ error?: string; status?: WaInstanceLiveStatus }> {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error };
  if (!uuid.safeParse(tenantId).success || !uuid.safeParse(instanceId).success) {
    return { error: INVALID };
  }

  const client = await getScopedSupabaseClient();
  if (!(await tenantBelongsToWorkspace(client, ctx.workspaceId, tenantId))) {
    return { error: NO_ACCESS };
  }

  const token = await getUserAccessToken();
  if (!token) return { error: NO_ACCESS };

  try {
    const status = await new GetWaInstanceStatusUseCase(new WaBackendManagementRepository())
      .execute(instanceId, token);
    return { status };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function getWaInstanceQrCode(
  tenantId: string,
  instanceId: string
): Promise<{ error?: string; qrcode?: string; alreadyConnected?: boolean }> {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error };
  if (!uuid.safeParse(tenantId).success || !uuid.safeParse(instanceId).success) {
    return { error: INVALID };
  }

  const client = await getScopedSupabaseClient();
  if (!(await tenantBelongsToWorkspace(client, ctx.workspaceId, tenantId))) {
    return { error: NO_ACCESS };
  }

  const token = await getUserAccessToken();
  if (!token) return { error: NO_ACCESS };

  try {
    const result = await new GetWaInstanceQrCodeUseCase(new WaBackendManagementRepository())
      .execute(instanceId, token);
    if (result.alreadyConnected) return { alreadyConnected: true };
    // backend devolve `value` (URL de pareamento); `qrcode` por compat (data URI antigo)
    return { qrcode: result.qr.value ?? result.qr.qrcode };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── Mutação (gate settings:edit → owner/admin) + auditoria ───────────────────

async function mutateInstance(
  tenantId: string,
  instanceId: string,
  action: AuditAction,
  run: (instanceId: string, token: string) => Promise<void>
): Promise<{ error?: string }> {
  const ctx = await getWorkspaceContext("settings", "edit");
  if ("error" in ctx) return { error: ctx.error };
  if (!uuid.safeParse(tenantId).success || !uuid.safeParse(instanceId).success) {
    return { error: INVALID };
  }

  const client = await getScopedSupabaseClient();
  if (!(await tenantBelongsToWorkspace(client, ctx.workspaceId, tenantId))) {
    return { error: NO_ACCESS };
  }

  const token = await getUserAccessToken();
  if (!token) return { error: NO_ACCESS };

  try {
    await run(instanceId, token);
    await createAuditLog({
      action,
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      entity_type: "wa_instance",
      entity_id: instanceId,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, source: "user" },
    });
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function restartWaInstance(tenantId: string, instanceId: string) {
  return mutateInstance(
    tenantId,
    instanceId,
    AUDIT_ACTIONS.WA_INSTANCE_RESTARTED,
    (id, token) => new RestartWaInstanceUseCase(new WaBackendManagementRepository()).execute(id, token)
  );
}

export async function disconnectWaInstance(tenantId: string, instanceId: string) {
  return mutateInstance(
    tenantId,
    instanceId,
    AUDIT_ACTIONS.WA_INSTANCE_DISCONNECTED,
    (id, token) => new DisconnectWaInstanceUseCase(new WaBackendManagementRepository()).execute(id, token)
  );
}

// ── account-settings: perfil/privacidade (v2.3) ──────────────────────────────

/** Gate + validações comuns das rotas de account-settings (tenant+instance). */
async function authorizeAccountAction(
  tenantId: string,
  instanceId: string,
  action: "view" | "edit"
): Promise<{ error: string } | { workspaceId: string; userId: string; token: string }> {
  const ctx = await getWorkspaceContext("settings", action);
  if ("error" in ctx) return { error: ctx.error };
  if (!uuid.safeParse(tenantId).success || !uuid.safeParse(instanceId).success) {
    return { error: INVALID };
  }
  const client = await getScopedSupabaseClient();
  if (!(await tenantBelongsToWorkspace(client, ctx.workspaceId, tenantId))) {
    return { error: NO_ACCESS };
  }
  const token = await getUserAccessToken();
  if (!token) return { error: NO_ACCESS };
  return { workspaceId: ctx.workspaceId, userId: ctx.userId, token };
}

export async function getWaProfile(
  tenantId: string,
  instanceId: string
): Promise<{ error?: string; profile?: WaProfile }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "view");
  if ("error" in auth) return { error: auth.error };
  try {
    const profile = await new GetWaProfileUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, auth.token);
    return { profile };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function getWaPrivacy(
  tenantId: string,
  instanceId: string
): Promise<{ error?: string; privacy?: WaPrivacySettings }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "view");
  if ("error" in auth) return { error: auth.error };
  try {
    const privacy = await new GetWaPrivacyUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, auth.token);
    return { privacy };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

const profileFieldSchema = z.object({
  field: z.enum(["name", "description", "picture"]),
  value: z.string().trim().min(1, "Valor obrigatório.").max(2000),
});

export async function updateWaProfileField(
  tenantId: string,
  instanceId: string,
  field: string,
  value: string
): Promise<{ error?: string }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };

  const parsed = profileFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await new UpdateWaProfileFieldUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, parsed.data.field, parsed.data.value, auth.token);

    await createAuditLog({
      action: AUDIT_ACTIONS.WA_PROFILE_UPDATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_instance",
      entity_id: instanceId,
      ip_address: await getClientIp(),
      // metadata sem o valor (pode conter URL/PII) — só qual campo mudou
      metadata: { tenant_id: tenantId, field: parsed.data.field, source: "user" },
    });
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── privacidade — edição (v2.3b) ─────────────────────────────────────────────

const vizSchema = z.enum(["ALL", "NONE", "CONTACT_BLACKLIST"]);
const blacklistSchema = z
  .array(z.object({ action: z.enum(["add", "remove"]), phone: z.string().regex(/^\d{8,15}$/, "Telefone inválido.") }))
  .max(200);

/** Valida visualizationType + blacklist (obrigatória só p/ CONTACT_BLACKLIST). */
function validateVizBody(
  viz: string,
  blacklist: WaBlacklistOp[] | undefined
): { error: string } | { viz: WaVisualizationType; blacklist?: WaBlacklistOp[] } {
  const v = vizSchema.safeParse(viz);
  if (!v.success) return { error: INVALID };
  if (v.data === "CONTACT_BLACKLIST") {
    const bl = blacklistSchema.safeParse(blacklist ?? []);
    if (!bl.success) return { error: bl.error.issues[0].message };
    if (bl.data.length === 0) return { error: "Informe ao menos um contato para a lista de exceções." };
    return { viz: v.data, blacklist: bl.data };
  }
  return { viz: v.data }; // ALL/NONE — sem blacklist
}

async function auditPrivacy(workspaceId: string, userId: string, instanceId: string, tenantId: string, setting: string) {
  await createAuditLog({
    action: AUDIT_ACTIONS.WA_PRIVACY_UPDATED,
    workspace_id: workspaceId,
    user_id: userId,
    entity_type: "wa_instance",
    entity_id: instanceId,
    ip_address: await getClientIp(),
    metadata: { tenant_id: tenantId, setting, source: "user" }, // sem telefones (PII)
  });
}

export async function getWaDisallowedContacts(
  tenantId: string,
  instanceId: string,
  type: WaDisallowedType
): Promise<{ error?: string; contacts?: string[] }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "view");
  if ("error" in auth) return { error: auth.error };
  if (!["lastSeen", "photo", "description", "groupAdd"].includes(type)) return { error: INVALID };
  try {
    const res: WaDisallowedContacts = await new GetWaDisallowedContactsUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, type, auth.token);
    return { contacts: res.contacts ?? [] };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

const VIS_SETTINGS: WaVisibilitySetting[] = ["last-seen", "photo", "description", "online"];

export async function updateWaVisibility(
  tenantId: string,
  instanceId: string,
  setting: string,
  visualizationType: string,
  blacklist?: WaBlacklistOp[]
): Promise<{ error?: string }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  if (!VIS_SETTINGS.includes(setting as WaVisibilitySetting)) return { error: INVALID };
  const body = validateVizBody(visualizationType, blacklist);
  if ("error" in body) return { error: body.error };
  try {
    await new UpdateWaVisibilityUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, setting as WaVisibilitySetting, body.viz, body.blacklist, auth.token);
    await auditPrivacy(auth.workspaceId, auth.userId, instanceId, tenantId, setting);
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function updateWaGroupAdd(
  tenantId: string,
  instanceId: string,
  visualizationType: string,
  blacklist?: WaBlacklistOp[]
): Promise<{ error?: string }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  const body = validateVizBody(visualizationType, blacklist);
  if ("error" in body) return { error: body.error };
  try {
    await new UpdateWaGroupAddUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, body.viz, body.blacklist, auth.token);
    await auditPrivacy(auth.workspaceId, auth.userId, instanceId, tenantId, "group-add");
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function updateWaReadReceipts(
  tenantId: string,
  instanceId: string,
  value: string
): Promise<{ error?: string }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  const v = z.enum(["enable", "disable"]).safeParse(value);
  if (!v.success) return { error: INVALID };
  try {
    await new UpdateWaReadReceiptsUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, v.data as WaReadReceiptsValue, auth.token);
    await auditPrivacy(auth.workspaceId, auth.userId, instanceId, tenantId, "read-receipts");
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function updateWaMessagesDuration(
  tenantId: string,
  instanceId: string,
  value: string
): Promise<{ error?: string }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  const v = z.enum(["days90", "days7", "hours24", "disable"]).safeParse(value);
  if (!v.success) return { error: INVALID };
  try {
    await new UpdateWaMessagesDurationUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, v.data as WaMessagesDurationValue, auth.token);
    await auditPrivacy(auth.workspaceId, auth.userId, instanceId, tenantId, "messages-duration");
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── foto de perfil via upload (v2.3b) ────────────────────────────────────────

const PIC_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadWaProfilePicture(
  tenantId: string,
  instanceId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await authorizeAccountAction(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Arquivo inválido." };
  if (file.size > 5 * 1024 * 1024) return { error: "Imagem muito grande (máx 5 MB)." };
  if (!PIC_TYPES.includes(file.type)) return { error: "Formato inválido. Use JPG, PNG ou WebP." };

  const form = new FormData();
  form.append("file", file);
  form.append("media_type", "image");

  try {
    await new UploadWaProfilePictureUseCase(new WaBackendManagementRepository())
      .execute(tenantId, instanceId, form, auth.token);
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_PROFILE_UPDATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_instance",
      entity_id: instanceId,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, field: "picture", source: "user" },
    });
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}
