import { SupabaseClient } from "@supabase/supabase-js";
import type {
  IntegrationStatus,
  WorkspaceIntegration,
  WorkspaceIntegrationWithWaTenant,
  WaTenantOption,
  WaProviderOption,
} from "@/types";

export interface CreateWorkspaceIntegrationDTO {
  workspace_id: string;
  wa_tenant_id: string;
  integration_type: string;
  provider_id: string;
  label?: string | null;
  status: IntegrationStatus;
}

export interface UpdateWorkspaceIntegrationDTO {
  label?: string | null;
  status?: IntegrationStatus;
  provider_id?: string;
}

/** Vínculo WhatsApp resolvido para o BFF: qual wa_tenant_id + label do workspace. */
export interface WaTenantLink {
  wa_tenant_id: string;
  label: string | null;
}

export interface IWorkspaceIntegrationRepository {
  listByWorkspace(workspaceId: string): Promise<WorkspaceIntegrationWithWaTenant[]>;
  listAvailableWaTenants(): Promise<WaTenantOption[]>;
  listProviders(): Promise<WaProviderOption[]>;
  create(dto: CreateWorkspaceIntegrationDTO): Promise<WorkspaceIntegration>;
  update(id: string, dto: UpdateWorkspaceIntegrationDTO): Promise<void>;
  remove(id: string): Promise<void>;
  /**
   * Vínculos WhatsApp ativos do workspace (apenas colunas de
   * workspace_integrations — sem tocar wa_*). Usado pelo BFF (ADR-006) para
   * resolver/validar os wa_tenant_id que o workspace pode operar. Lê via o
   * cliente injetado (RLS do membro ou escopado durante impersonação, R-009).
   */
  listWaTenantLinksByWorkspace(workspaceId: string): Promise<WaTenantLink[]>;
}

// Leitura cross-domain de wa_tenants/wa_instances/wa_providers é sempre
// somente-leitura (SELECT) — o CRM nunca escreve em tabelas wa_* (ADR-001).
export class SupabaseWorkspaceIntegrationRepository implements IWorkspaceIntegrationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listByWorkspace(workspaceId: string): Promise<WorkspaceIntegrationWithWaTenant[]> {
    const { data, error } = await this.client
      .from("workspace_integrations")
      .select("*, wa_tenants(name, display_name, slug)")
      .eq("workspace_id", workspaceId)
      .order("created_at");
    if (error) throw new Error(error.message);
    if (!data?.length) return [];

    const rows = data as unknown as Array<
      WorkspaceIntegration & {
        wa_tenants: { name: string; display_name: string | null; slug: string } | null;
      }
    >;

    const waTenantIds = rows
      .map((row) => row.wa_tenant_id)
      .filter((id): id is string => !!id);

    let counts: Record<string, number> = {};
    if (waTenantIds.length > 0) {
      const { data: instances, error: instancesError } = await this.client
        .from("wa_instances")
        .select("tenant_id")
        .in("tenant_id", waTenantIds);
      if (instancesError) throw new Error(instancesError.message);
      counts = (instances ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.tenant_id] = (acc[r.tenant_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    return rows.map(({ wa_tenants: waTenant, ...row }) => ({
      ...row,
      wa_tenant_name: waTenant?.name ?? null,
      wa_tenant_display_name: waTenant?.display_name ?? null,
      wa_tenant_slug: waTenant?.slug ?? null,
      wa_instance_count: row.wa_tenant_id ? counts[row.wa_tenant_id] ?? 0 : 0,
    }));
  }

  async listAvailableWaTenants(): Promise<WaTenantOption[]> {
    const { data: linked, error: linkedError } = await this.client
      .from("workspace_integrations")
      .select("wa_tenant_id")
      .not("wa_tenant_id", "is", null);
    if (linkedError) throw new Error(linkedError.message);

    const linkedIds = (linked ?? [])
      .map((row) => row.wa_tenant_id as string | null)
      .filter((id): id is string => !!id);

    let query = this.client
      .from("wa_tenants")
      .select("id, name, display_name, slug, is_active, plan_status")
      .order("name");
    if (linkedIds.length > 0) {
      query = query.not("id", "in", `(${linkedIds.join(",")})`);
    }

    const { data: tenants, error } = await query;
    if (error) throw new Error(error.message);
    if (!tenants?.length) return [];

    const tenantIds = tenants.map((t) => t.id);
    const { data: instances, error: instancesError } = await this.client
      .from("wa_instances")
      .select("tenant_id")
      .in("tenant_id", tenantIds);
    if (instancesError) throw new Error(instancesError.message);

    const counts = (instances ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.tenant_id] = (acc[r.tenant_id] ?? 0) + 1;
      return acc;
    }, {});

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      display_name: t.display_name,
      slug: t.slug,
      is_active: t.is_active,
      plan_status: t.plan_status,
      instance_count: counts[t.id] ?? 0,
    }));
  }

  async listProviders(): Promise<WaProviderOption[]> {
    const { data, error } = await this.client
      .from("wa_providers")
      .select("id, name, type")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as WaProviderOption[];
  }

  async create(dto: CreateWorkspaceIntegrationDTO): Promise<WorkspaceIntegration> {
    const { data, error } = await this.client
      .from("workspace_integrations")
      .insert({
        workspace_id: dto.workspace_id,
        wa_tenant_id: dto.wa_tenant_id,
        integration_type: dto.integration_type,
        provider_id: dto.provider_id,
        label: dto.label ?? null,
        status: dto.status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as WorkspaceIntegration;
  }

  async update(id: string, dto: UpdateWorkspaceIntegrationDTO): Promise<void> {
    const { error } = await this.client
      .from("workspace_integrations")
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client
      .from("workspace_integrations")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async listWaTenantLinksByWorkspace(workspaceId: string): Promise<WaTenantLink[]> {
    const { data, error } = await this.client
      .from("workspace_integrations")
      .select("wa_tenant_id, label")
      .eq("workspace_id", workspaceId)
      .eq("integration_type", "whatsapp")
      .not("wa_tenant_id", "is", null);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((r): r is { wa_tenant_id: string; label: string | null } => !!r.wa_tenant_id)
      .map((r) => ({ wa_tenant_id: r.wa_tenant_id, label: r.label ?? null }));
  }
}
