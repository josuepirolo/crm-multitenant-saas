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
} from "@/usecases/WaManagementUseCases";
import { createAuditLog, AUDIT_ACTIONS, type AuditAction } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WaInstanceWithTenant, WaInstanceLiveStatus } from "@/types";

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
    return { qrcode: result.qr.qrcode };
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
