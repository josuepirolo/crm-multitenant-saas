"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { publicError } from "@/lib/security/security-errors";
import { SupabaseWorkspaceIntegrationRepository } from "@/repositories/workspace-integration.repository";
import {
  ListWorkspaceIntegrationsUseCase,
  ListAvailableWaTenantsUseCase,
  ListWaProvidersUseCase,
  LinkWaTenantUseCase,
  UpdateWorkspaceIntegrationUseCase,
  UnlinkWaTenantUseCase,
} from "@/usecases/WorkspaceIntegrationUseCases";
import {
  linkWorkspaceIntegrationSchema,
  updateWorkspaceIntegrationSchema,
} from "@/lib/validations/workspace-integration";

const DUPLICATE_TENANT_ERROR = "Esta instância já está vinculada a outra empresa.";

function makeRepo() {
  return new SupabaseWorkspaceIntegrationRepository(createAdminClient());
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes(constraint);
}

export async function listWorkspaceIntegrationsAdmin(workspaceId: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", integrations: [] };

  try {
    const integrations = await new ListWorkspaceIntegrationsUseCase(makeRepo()).execute(workspaceId);
    return { error: undefined, integrations };
  } catch {
    return { error: "Erro ao buscar integrações.", integrations: [] };
  }
}

export async function listAvailableWaTenantsAdmin() {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", tenants: [] };

  try {
    const tenants = await new ListAvailableWaTenantsUseCase(makeRepo()).execute();
    return { error: undefined, tenants };
  } catch {
    return { error: "Erro ao buscar instâncias disponíveis.", tenants: [] };
  }
}

export async function listWaProvidersAdmin() {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", providers: [] };

  try {
    const providers = await new ListWaProvidersUseCase(makeRepo()).execute();
    return { error: undefined, providers };
  } catch {
    return { error: "Erro ao buscar providers.", providers: [] };
  }
}

export async function linkWaTenantAdmin(workspaceId: string, _: unknown, formData: FormData) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = linkWorkspaceIntegrationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const integration = await new LinkWaTenantUseCase(makeRepo()).execute({
      workspace_id: workspaceId,
      wa_tenant_id: parsed.data.wa_tenant_id,
      integration_type: parsed.data.integration_type,
      provider_id: parsed.data.provider_id,
      label: parsed.data.label?.trim() || null,
      status: parsed.data.status,
    });

    await createAuditLog({
      action:       AUDIT_ACTIONS.INTEGRATION_LINKED,
      workspace_id: workspaceId,
      user_id:      sa.userId,
      entity_type:  "workspace_integration",
      entity_id:    integration.id,
      ip_address:   await getClientIp(),
      metadata: {
        wa_tenant_id: parsed.data.wa_tenant_id,
        provider_id:  parsed.data.provider_id,
        label:        parsed.data.label || null,
        status:       parsed.data.status,
        source: "admin",
      },
    });

    return { error: undefined, integration };
  } catch (err) {
    if (isUniqueViolation(err, "workspace_integrations_wa_tenant_id_unique")) {
      return { error: DUPLICATE_TENANT_ERROR };
    }
    return publicError(err, "Erro ao vincular instância.");
  }
}

export async function updateWorkspaceIntegrationAdmin(
  id: string,
  workspaceId: string,
  _: unknown,
  formData: FormData
) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateWorkspaceIntegrationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const patch = {
    ...parsed.data,
    label: parsed.data.label !== undefined ? (parsed.data.label.trim() || null) : undefined,
  };

  try {
    await new UpdateWorkspaceIntegrationUseCase(makeRepo()).execute(id, patch);

    await createAuditLog({
      action:       AUDIT_ACTIONS.INTEGRATION_UPDATED,
      workspace_id: workspaceId,
      user_id:      sa.userId,
      entity_type:  "workspace_integration",
      entity_id:    id,
      ip_address:   await getClientIp(),
      metadata:     { updated_fields: Object.keys(parsed.data), source: "admin" },
    });

    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar integração.");
  }
}

export async function unlinkWaTenantAdmin(id: string, workspaceId: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };

  try {
    await new UnlinkWaTenantUseCase(makeRepo()).execute(id);

    await createAuditLog({
      action:       AUDIT_ACTIONS.INTEGRATION_UNLINKED,
      workspace_id: workspaceId,
      user_id:      sa.userId,
      entity_type:  "workspace_integration",
      entity_id:    id,
      ip_address:   await getClientIp(),
      metadata:     { source: "admin" },
    });

    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao remover vínculo.");
  }
}
