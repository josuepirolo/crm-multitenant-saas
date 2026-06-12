"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  listWorkspaceIntegrationsAdmin,
  listAvailableWaTenantsAdmin,
  listWaProvidersAdmin,
  linkWaTenantAdmin,
  updateWorkspaceIntegrationAdmin,
  unlinkWaTenantAdmin,
} from "@/app/(admin)/admin/integrations-actions";
import type {
  WorkspaceIntegrationWithWaTenant,
  WaTenantOption,
  WaProviderOption,
  IntegrationStatus,
} from "@/types";

export function useWorkspaceIntegrationsViewModel(workspaceId: string | null) {
  const [integrations, setIntegrations]           = useState<WorkspaceIntegrationWithWaTenant[]>([]);
  const [availableTenants, setAvailableTenants]   = useState<WaTenantOption[]>([]);
  const [providers, setProviders]                 = useState<WaProviderOption[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [loaded, setLoaded]                       = useState(false);
  const [linking, setLinking]                     = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);

    const [integrationsResult, tenantsResult, providersResult] = await Promise.all([
      listWorkspaceIntegrationsAdmin(workspaceId),
      listAvailableWaTenantsAdmin(),
      listWaProvidersAdmin(),
    ]);

    if (integrationsResult.error) toast.error(integrationsResult.error);
    else setIntegrations(integrationsResult.integrations);

    if (tenantsResult.error) toast.error(tenantsResult.error);
    else setAvailableTenants(tenantsResult.tenants);

    if (providersResult.error) toast.error(providersResult.error);
    else setProviders(providersResult.providers);

    setLoading(false);
    setLoaded(true);
  }, [workspaceId]);

  async function linkWaTenant(formData: FormData): Promise<boolean> {
    if (!workspaceId) return false;
    setLinking(true);

    const promise = linkWaTenantAdmin(workspaceId, null, formData).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(promise, {
      loading: "Vinculando instância...",
      success: "Instância vinculada!",
      error: (err: Error) => err.message,
    });

    try {
      await promise;
      await load();
      return true;
    } catch {
      return false;
    } finally {
      setLinking(false);
    }
  }

  async function updateIntegration(id: string, patch: { label?: string; status?: IntegrationStatus }) {
    if (!workspaceId) return;
    const prev = integrations.find((i) => i.id === id);
    if (!prev) return;

    setIntegrations((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

    const fd = new FormData();
    if (patch.label !== undefined) fd.append("label", patch.label);
    if (patch.status !== undefined) fd.append("status", patch.status);

    const promise = updateWorkspaceIntegrationAdmin(id, workspaceId, null, fd).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(promise, {
      loading: "Salvando...",
      success: "Integração atualizada!",
      error: (err: Error) => err.message,
    });

    try {
      await promise;
    } catch {
      setIntegrations((list) => list.map((i) => (i.id === id ? prev : i)));
    }
  }

  async function unlinkWaTenant(id: string) {
    if (!workspaceId) return;
    const prevList = integrations;
    setIntegrations((list) => list.filter((i) => i.id !== id));

    const promise = unlinkWaTenantAdmin(id, workspaceId).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(promise, {
      loading: "Removendo vínculo...",
      success: "Vínculo removido.",
      error: (err: Error) => err.message,
    });

    try {
      await promise;
      await load();
    } catch {
      setIntegrations(prevList);
    }
  }

  return {
    integrations,
    availableTenants,
    providers,
    loading,
    loaded,
    linking,
    load,
    linkWaTenant,
    updateIntegration,
    unlinkWaTenant,
  };
}
