"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  listWaCampaigns,
  createWaCampaign,
  setWaCampaignAudience,
  launchWaCampaign,
  pauseWaCampaign,
  resumeWaCampaign,
  cancelWaCampaign,
} from "@/app/(dashboard)/whatsapp/campanhas/actions";
import type { WaCampaign, WaInstanceWithTenant } from "@/types";

export type WaCampanhasState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; items: WaCampaign[]; total: number }
  | { status: "error"; message: string };

export function useWaCampanhasViewModel(instances: WaInstanceWithTenant[]) {
  const [state, setState] = useState<WaCampanhasState>({ status: "idle" });
  const [selectedInstance, setSelectedInstance] = useState<WaInstanceWithTenant | null>(
    instances.length === 1 ? instances[0] : null
  );
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    if (!selectedInstance) return;
    setState({ status: "loading" });
    startTransition(async () => {
      const res = await listWaCampaigns(selectedInstance.tenant_id, selectedInstance.instance_id);
      if (res.error) {
        setState({ status: "error", message: res.error });
      } else {
        setState({ status: "loaded", items: res.items, total: res.total });
      }
    });
  }, [selectedInstance]);

  const handleSelectInstance = useCallback((instance: WaInstanceWithTenant) => {
    setSelectedInstance(instance);
    setState({ status: "idle" });
  }, []);

  const handleCreateCampaign = useCallback(
    async (payload: {
      name: string;
      type: string;
      text?: string;
      phones: string[];
    }): Promise<boolean> => {
      if (!selectedInstance) return false;

      const toastId = toast.loading("Criando campanha...");
      const createRes = await createWaCampaign(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        { name: payload.name, type: payload.type, text: payload.text }
      );
      if (createRes.error || !createRes.campaign) {
        toast.error(createRes.error ?? "Erro ao criar campanha.", { id: toastId });
        return false;
      }

      if (payload.phones.length > 0) {
        const audienceRes = await setWaCampaignAudience(
          selectedInstance.tenant_id,
          selectedInstance.instance_id,
          createRes.campaign.campaign_id,
          payload.phones
        );
        if (audienceRes.error) {
          toast.error(`Campanha criada mas audiência falhou: ${audienceRes.error}`, { id: toastId });
          load();
          return false;
        }
        const count = audienceRes.result?.recipient_count ?? 0;
        toast.success(`Campanha "${payload.name}" criada com ${count} destinatário(s).`, { id: toastId });
      } else {
        toast.success(`Campanha "${payload.name}" criada (rascunho).`, { id: toastId });
      }

      load();
      return true;
    },
    [selectedInstance, load]
  );

  const handleLifecycle = useCallback(
    async (campaignId: string, action: "launch" | "pause" | "resume" | "cancel"): Promise<void> => {
      if (!selectedInstance) return;

      const labels = { launch: "Disparar", pause: "Pausar", resume: "Retomar", cancel: "Cancelar" };
      const toastId = toast.loading(`${labels[action]}ndo campanha...`);

      const fn =
        action === "launch" ? launchWaCampaign :
        action === "pause"  ? pauseWaCampaign  :
        action === "resume" ? resumeWaCampaign :
                              cancelWaCampaign;

      const res = await fn(selectedInstance.tenant_id, selectedInstance.instance_id, campaignId);
      if (res.error) {
        toast.error(res.error, { id: toastId });
        return;
      }
      const successMsg = { launch: "Campanha disparada!", pause: "Campanha pausada.", resume: "Campanha retomada.", cancel: "Campanha cancelada." };
      toast.success(successMsg[action], { id: toastId });
      load();
    },
    [selectedInstance, load]
  );

  return {
    state,
    isPending,
    instances,
    selectedInstance,
    handleSelectInstance,
    load,
    handleCreateCampaign,
    handleLifecycle,
  };
}
