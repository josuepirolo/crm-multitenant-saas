"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  listWaGroups,
  createWaGroup,
  getWaGroupMetadata,
  updateWaGroupName,
  updateWaGroupDescription,
  addWaGroupParticipants,
  removeWaGroupParticipants,
} from "@/app/(dashboard)/whatsapp/grupos/actions";
import type { WaConversation, WaGroupMetadata, WaInstanceWithTenant } from "@/types";

export type WaGruposState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; groups: WaConversation[] }
  | { status: "error"; message: string };

export function useWaGruposViewModel(instances: WaInstanceWithTenant[]) {
  const [state, setState] = useState<WaGruposState>({ status: "idle" });
  const [selectedInstance, setSelectedInstance] = useState<WaInstanceWithTenant | null>(
    instances.length === 1 ? instances[0] : null
  );
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    if (!selectedInstance) return;
    setState({ status: "loading" });
    startTransition(async () => {
      const res = await listWaGroups(selectedInstance.tenant_id, selectedInstance.instance_id);
      if (res.error) {
        setState({ status: "error", message: res.error });
      } else {
        setState({ status: "loaded", groups: res.groups });
      }
    });
  }, [selectedInstance]);

  const handleSelectInstance = useCallback((instance: WaInstanceWithTenant) => {
    setSelectedInstance(instance);
    setState({ status: "idle" });
  }, []);

  const handleCreateGroup = useCallback(
    async (groupName: string, phones: string[]): Promise<boolean> => {
      if (!selectedInstance) return false;
      const toastId = toast.loading("Criando grupo...");
      const res = await createWaGroup(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        groupName,
        phones
      );
      if (res.error) {
        toast.error(res.error, { id: toastId });
        return false;
      }
      toast.success(`Grupo "${groupName}" criado com sucesso!`, { id: toastId });
      load();
      return true;
    },
    [selectedInstance, load]
  );

  const handleGetMetadata = useCallback(
    async (groupId: string): Promise<WaGroupMetadata | null> => {
      if (!selectedInstance) return null;
      const res = await getWaGroupMetadata(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        groupId
      );
      if (res.error || !res.metadata) return null;
      return res.metadata;
    },
    [selectedInstance]
  );

  const handleRenameGroup = useCallback(
    async (groupId: string, value: string): Promise<boolean> => {
      if (!selectedInstance) return false;
      const res = await updateWaGroupName(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        groupId,
        value
      );
      if (res.error) {
        toast.error(res.error);
        return false;
      }
      toast.success("Nome atualizado.");
      load();
      return true;
    },
    [selectedInstance, load]
  );

  const handleUpdateDescription = useCallback(
    async (groupId: string, value: string): Promise<boolean> => {
      if (!selectedInstance) return false;
      const res = await updateWaGroupDescription(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        groupId,
        value
      );
      if (res.error) {
        toast.error(res.error);
        return false;
      }
      toast.success("Descrição atualizada.");
      return true;
    },
    [selectedInstance]
  );

  const handleAddParticipants = useCallback(
    async (groupId: string, phones: string[]): Promise<boolean> => {
      if (!selectedInstance) return false;
      const res = await addWaGroupParticipants(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        groupId,
        phones
      );
      if (res.error) { toast.error(res.error); return false; }
      toast.success("Participantes adicionados.");
      return true;
    },
    [selectedInstance]
  );

  const handleRemoveParticipant = useCallback(
    async (groupId: string, phone: string): Promise<boolean> => {
      if (!selectedInstance) return false;
      const res = await removeWaGroupParticipants(
        selectedInstance.tenant_id,
        selectedInstance.instance_id,
        groupId,
        [phone]
      );
      if (res.error) { toast.error(res.error); return false; }
      toast.success("Participante removido.");
      load();
      return true;
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
    handleCreateGroup,
    handleGetMetadata,
    handleRenameGroup,
    handleUpdateDescription,
    handleAddParticipants,
    handleRemoveParticipant,
  };
}
