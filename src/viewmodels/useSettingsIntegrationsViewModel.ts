"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  listWorkspaceWaInstances,
  getWaInstanceStatus,
  getWaInstanceQrCode,
  restartWaInstance,
  disconnectWaInstance,
} from "@/app/(dashboard)/settings/integrations-actions";
import type { WaInstanceLiveStatus, WaInstanceWithTenant } from "@/types";

export interface QrCodeResult {
  qrcode?: string;
  alreadyConnected?: boolean;
  error?: string;
}

/**
 * ViewModel da aba "Integrações" (BFF — ADR-006). Orquestra a listagem de
 * instâncias WhatsApp do workspace, o status ao vivo (polling) e as ações de
 * reiniciar/desconectar. A View nunca chama Server Actions direto — só o VM.
 */
export function useSettingsIntegrationsViewModel() {
  const [instances, setInstances] = useState<WaInstanceWithTenant[]>([]);
  const [statuses, setStatuses] = useState<Record<string, WaInstanceLiveStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listWorkspaceWaInstances();
    if (!mounted.current) return;
    if (res.error) {
      setError(res.error);
      setInstances([]);
    } else {
      setInstances(res.instances);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshStatus = useCallback(async (inst: WaInstanceWithTenant) => {
    const res = await getWaInstanceStatus(inst.tenant_id, inst.instance_id);
    if (!mounted.current || !res.status) return;
    setStatuses((prev) => ({ ...prev, [inst.instance_id]: res.status! }));
  }, []);

  const refreshAllStatuses = useCallback(async () => {
    await Promise.allSettled(instances.map((inst) => refreshStatus(inst)));
  }, [instances, refreshStatus]);

  // Polling do status ao vivo enquanto a aba está montada.
  useEffect(() => {
    if (instances.length === 0) return;
    refreshAllStatuses();
    const id = setInterval(refreshAllStatuses, 20_000);
    return () => clearInterval(id);
  }, [instances, refreshAllStatuses]);

  const fetchStatus = useCallback(
    async (inst: WaInstanceWithTenant): Promise<WaInstanceLiveStatus | null> => {
      const res = await getWaInstanceStatus(inst.tenant_id, inst.instance_id);
      if (res.status && mounted.current) {
        setStatuses((prev) => ({ ...prev, [inst.instance_id]: res.status! }));
      }
      return res.status ?? null;
    },
    []
  );

  const fetchQrCode = useCallback(
    async (inst: WaInstanceWithTenant): Promise<QrCodeResult> => {
      return getWaInstanceQrCode(inst.tenant_id, inst.instance_id);
    },
    []
  );

  const restart = useCallback(
    async (inst: WaInstanceWithTenant) => {
      const promise = restartWaInstance(inst.tenant_id, inst.instance_id).then((r) => {
        if (r.error) throw new Error(r.error);
      });
      toast.promise(promise, {
        loading: "Reiniciando instância...",
        success: "Instância reiniciada.",
        error: (e: Error) => e.message,
      });
      try {
        await promise;
        await refreshStatus(inst);
      } catch {
        /* toast já exibiu o erro */
      }
    },
    [refreshStatus]
  );

  const disconnect = useCallback(
    async (inst: WaInstanceWithTenant) => {
      const promise = disconnectWaInstance(inst.tenant_id, inst.instance_id).then((r) => {
        if (r.error) throw new Error(r.error);
      });
      toast.promise(promise, {
        loading: "Desconectando...",
        success: "Instância desconectada.",
        error: (e: Error) => e.message,
      });
      try {
        await promise;
        await refreshStatus(inst);
      } catch {
        /* toast já exibiu o erro */
      }
    },
    [refreshStatus]
  );

  return {
    instances,
    statuses,
    loading,
    error,
    reload: load,
    refreshStatus,
    fetchStatus,
    fetchQrCode,
    restart,
    disconnect,
  };
}
