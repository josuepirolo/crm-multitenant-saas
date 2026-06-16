"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { authorizeWaOperation, mapWaError, INVALID } from "../_helpers";
import { WaBackendOperationalRepository } from "@/repositories/wa-operational.repository";
import {
  ListWaGroupsUseCase,
  CreateWaGroupUseCase,
  UpdateWaGroupNameUseCase,
  UpdateWaGroupDescriptionUseCase,
  AddWaGroupParticipantsUseCase,
  RemoveWaGroupParticipantsUseCase,
} from "@/usecases/WaOperationalUseCases";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import type { WaConversation, WaGroupCreated } from "@/types";

const repo = () => new WaBackendOperationalRepository();

const phoneSchema = z.string().regex(/^\d{10,15}$/, "Telefone inválido (somente dígitos, 10-15).");
const phonesSchema = z.array(phoneSchema).min(1).max(50);

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function listWaGroups(
  tenantId: string,
  instanceId: string
): Promise<{ error?: string; groups: WaConversation[] }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "view");
  if ("error" in auth) return { error: auth.error, groups: [] };
  try {
    const groups = await new ListWaGroupsUseCase(repo()).execute(tenantId, auth.token);
    return { groups };
  } catch (err) {
    return { error: mapWaError(err), groups: [] };
  }
}

// ── Criação de grupo ──────────────────────────────────────────────────────────

const createGroupSchema = z.object({
  groupName: z.string().trim().min(1, "Nome do grupo obrigatório.").max(100),
  phones: phonesSchema,
});

export async function createWaGroup(
  tenantId: string,
  instanceId: string,
  groupName: string,
  phones: string[]
): Promise<{ error?: string; group?: WaGroupCreated }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };

  const parsed = createGroupSchema.safeParse({ groupName, phones });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const group = await new CreateWaGroupUseCase(repo()).execute(
      tenantId, instanceId, { groupName: parsed.data.groupName, phones: parsed.data.phones, autoInvite: true },
      auth.token
    );
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_GROUP_CREATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_group",
      entity_id: group.group_id,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, instance_id: instanceId, group_name: parsed.data.groupName, source: "user" },
    });
    revalidatePath("/whatsapp/grupos");
    return { group };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── Edição de nome ────────────────────────────────────────────────────────────

export async function updateWaGroupName(
  tenantId: string,
  instanceId: string,
  groupId: string,
  value: string
): Promise<{ error?: string }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  if (!groupId.trim()) return { error: INVALID };
  const v = z.string().trim().min(1).max(100).safeParse(value);
  if (!v.success) return { error: v.error.issues[0].message };
  try {
    await new UpdateWaGroupNameUseCase(repo()).execute(tenantId, instanceId, groupId, v.data, auth.token);
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_GROUP_UPDATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_group",
      entity_id: groupId,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, field: "name", source: "user" },
    });
    revalidatePath("/whatsapp/grupos");
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── Edição de descrição ───────────────────────────────────────────────────────

export async function updateWaGroupDescription(
  tenantId: string,
  instanceId: string,
  groupId: string,
  value: string
): Promise<{ error?: string }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  if (!groupId.trim()) return { error: INVALID };
  const v = z.string().trim().max(500).safeParse(value);
  if (!v.success) return { error: v.error.issues[0].message };
  try {
    await new UpdateWaGroupDescriptionUseCase(repo()).execute(tenantId, instanceId, groupId, v.data, auth.token);
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_GROUP_UPDATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_group",
      entity_id: groupId,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, field: "description", source: "user" },
    });
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

// ── Participantes ─────────────────────────────────────────────────────────────

async function participantAction(
  tenantId: string,
  instanceId: string,
  groupId: string,
  phones: string[],
  action: "add" | "remove"
): Promise<{ error?: string }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "edit");
  if ("error" in auth) return { error: auth.error };
  if (!groupId.trim()) return { error: INVALID };
  const p = phonesSchema.safeParse(phones);
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    const uc = action === "add"
      ? new AddWaGroupParticipantsUseCase(repo())
      : new RemoveWaGroupParticipantsUseCase(repo());
    await uc.execute(tenantId, instanceId, groupId, p.data, auth.token);
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_GROUP_UPDATED,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_group",
      entity_id: groupId,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, op: `${action}_participants`, count: p.data.length, source: "user" },
    });
    return {};
  } catch (err) {
    return { error: mapWaError(err) };
  }
}

export async function addWaGroupParticipants(t: string, i: string, g: string, phones: string[]) {
  return participantAction(t, i, g, phones, "add");
}
export async function removeWaGroupParticipants(t: string, i: string, g: string, phones: string[]) {
  return participantAction(t, i, g, phones, "remove");
}
