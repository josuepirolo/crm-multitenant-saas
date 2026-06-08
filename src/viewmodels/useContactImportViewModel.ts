"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importContactsAction } from "@/app/(dashboard)/contacts/import-actions";
import type { ContactImportResult } from "@/types";

export type ContactImportStage = "upload" | "result";

export function useContactImportViewModel(onImported: () => void) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<ContactImportStage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ContactImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStage("upload");
    setFile(null);
    setIsSubmitting(false);
    setResult(null);
    setError(null);
  }

  function openDialog() {
    reset();
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    reset();
  }

  function selectFile(next: File | null) {
    setError(null);
    setFile(next);
  }

  async function submit() {
    if (!file) return;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const resultPromise = importContactsAction(null, formData).then((response) => {
      if (response.error) throw new Error(response.error);
      return response.result!;
    });

    toast.promise(resultPromise, {
      loading: "Importando contatos...",
      success: (data) => `Importação concluída: ${data.created} criado(s), ${data.skipped} ignorado(s).`,
      error: (err: Error) => err.message ?? "Erro ao importar contatos.",
    });

    try {
      const data = await resultPromise;
      setResult(data);
      setStage("result");
      onImported();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    open,
    stage,
    file,
    isSubmitting,
    result,
    error,
    openDialog,
    closeDialog,
    selectFile,
    submit,
  };
}
