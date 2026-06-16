"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { sendWaMessage } from "@/app/(dashboard)/whatsapp/enviar/actions";
import type { WaInstanceWithTenant, WaMessageType } from "@/types";

export interface SendFormData {
  to: string;
  type: WaMessageType;
  text: string;
  media_url: string;
  caption: string;
}

const EMPTY_FORM: SendFormData = { to: "", type: "text", text: "", media_url: "", caption: "" };

export function useWaEnviarViewModel(instances: WaInstanceWithTenant[]) {
  const [selectedInstance, setSelectedInstance] = useState<WaInstanceWithTenant | null>(
    instances.length === 1 ? instances[0] : null
  );
  const [form, setForm] = useState<SendFormData>(EMPTY_FORM);
  const [isSending, setIsSending] = useState(false);
  const [lastSentId, setLastSentId] = useState<string | null>(null);

  const handleSelectInstance = useCallback((instance: WaInstanceWithTenant) => {
    setSelectedInstance(instance);
  }, []);

  const handleFieldChange = useCallback(<K extends keyof SendFormData>(key: K, value: SendFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSend = useCallback(async (): Promise<boolean> => {
    if (!selectedInstance) {
      toast.error("Selecione uma instância antes de enviar.");
      return false;
    }

    setIsSending(true);
    const toastId = toast.loading("Enviando mensagem...");

    const payload = {
      to: form.to,
      type: form.type,
      ...(form.type === "text" ? { text: form.text } : { media_url: form.media_url }),
      ...(form.caption ? { caption: form.caption } : {}),
    };

    const res = await sendWaMessage(selectedInstance.tenant_id, selectedInstance.instance_id, payload);
    setIsSending(false);

    if (res.error) {
      toast.error(res.error, { id: toastId });
      return false;
    }

    toast.success("Mensagem enviada!", { id: toastId });
    setLastSentId(res.sent?.message_id ?? null);
    setForm(EMPTY_FORM);
    return true;
  }, [selectedInstance, form]);

  return {
    instances,
    selectedInstance,
    form,
    isSending,
    lastSentId,
    handleSelectInstance,
    handleFieldChange,
    handleSend,
  };
}
