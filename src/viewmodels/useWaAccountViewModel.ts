"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getWaProfile,
  getWaPrivacy,
  updateWaProfileField,
} from "@/app/(dashboard)/settings/integrations-actions";
import type { WaInstanceWithTenant, WaProfile, WaPrivacySettings, WaProfileField } from "@/types";

/**
 * ViewModel do perfil/privacidade da conta WhatsApp (v2.3, BFF — ADR-006).
 * Carrega perfil + privacidade de uma instância e salva campos de perfil.
 * A View nunca chama Server Actions direto — só o VM.
 */
export function useWaAccountViewModel(instance: WaInstanceWithTenant) {
  const [profile, setProfile] = useState<WaProfile | null>(null);
  const [privacy, setPrivacy] = useState<WaPrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [pRes, prRes] = await Promise.all([
      getWaProfile(instance.tenant_id, instance.instance_id),
      getWaPrivacy(instance.tenant_id, instance.instance_id),
    ]);
    if (!alive.current) return;
    // Perfil é o conteúdo principal; privacidade é complementar (não derruba a tela).
    if (pRes.error) setError(pRes.error);
    else setProfile(pRes.profile ?? null);
    if (!prRes.error) setPrivacy(prRes.privacy ?? null);
    setLoading(false);
  }, [instance.tenant_id, instance.instance_id]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const saveProfileField = useCallback(
    async (field: WaProfileField, value: string) => {
      const promise = updateWaProfileField(instance.tenant_id, instance.instance_id, field, value).then(
        (r) => {
          if (r.error) throw new Error(r.error);
        }
      );
      toast.promise(promise, {
        loading: "Salvando...",
        success: "Perfil atualizado.",
        error: (e: Error) => e.message,
      });
      try {
        await promise;
        // otimista: reflete localmente sem refetch
        if (alive.current) setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
        return true;
      } catch {
        return false;
      }
    },
    [instance.tenant_id, instance.instance_id]
  );

  return { profile, privacy, loading, error, reload: load, saveProfileField };
}
