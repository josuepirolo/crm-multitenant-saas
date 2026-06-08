"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { listContactSources, createContactSource, renameContactSource, setContactSourceActive } from "@/app/(dashboard)/contacts/actions";
import type { ContactSource } from "@/types";

export function useContactSourcesViewModel(active: boolean) {
  const [sources, setSources] = useState<ContactSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const result = await listContactSources();
    setSources(result.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (active) fetchSources();
  }, [active, fetchSources]);

  async function onCreate(name: string) {
    setCreating(true);
    const formData = new FormData();
    formData.set("name", name);

    try {
      const result = await createContactSource(undefined, formData);
      if (result.error || !("source" in result) || !result.source) {
        toast.error(result.error ?? "Erro ao criar origem.");
        return;
      }
      setSources((prev) => [...prev, result.source!].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Origem criada!");
    } finally {
      setCreating(false);
    }
  }

  async function onRename(id: string, name: string) {
    const previous = sources;
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));

    const result = await renameContactSource(id, name);
    if (result.error) {
      setSources(previous);
      toast.error(result.error);
      return;
    }
    toast.success("Origem renomeada!");
  }

  async function onToggleActive(id: string, isActive: boolean) {
    const previous = sources;
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s)));

    const result = await setContactSourceActive(id, isActive);
    if (result.error) {
      setSources(previous);
      toast.error(result.error);
      return;
    }
    toast.success(isActive ? "Origem ativada." : "Origem desativada.");
  }

  return { sources, loading, creating, onCreate, onRename, onToggleActive };
}
