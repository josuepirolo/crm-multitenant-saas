"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importContactsAction, previewImportAction } from "@/app/(dashboard)/contacts/import-actions";
import { createContactSource } from "@/app/(dashboard)/contacts/actions";
import { MAX_IMPORT_ROWS } from "@/lib/contacts/parse-contact-import";
import type { ContactImportResult, ContactSource } from "@/types";
import type { ImportPreviewResult } from "@/lib/contacts/parse-contact-import";

export type ContactImportStage = "upload" | "preview" | "result";

function capitalizeFirst(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function useContactImportViewModel(onImported: () => void, initialSources: ContactSource[]) {
  const [open, setOpen]                         = useState(false);
  const [stage, setStage]                       = useState<ContactImportStage>("upload");
  const [file, setFile]                         = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [result, setResult]                     = useState<ContactImportResult | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [previewData, setPreviewData]           = useState<ImportPreviewResult | null>(null);
  const [sources, setSources]                   = useState<ContactSource[]>(initialSources);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [newSourceName, setNewSourceName]       = useState<string>("");
  const [creatingSource, setCreatingSource]     = useState(false);
  const [currentChunk, setCurrentChunk]         = useState(0);
  const [totalChunks, setTotalChunks]           = useState(1);
  const [processedRows, setProcessedRows]       = useState(0);

  function reset() {
    setStage("upload");
    setFile(null);
    setIsSubmitting(false);
    setResult(null);
    setError(null);
    setPreviewData(null);
    setSelectedSourceId("");
    setNewSourceName("");
    setCreatingSource(false);
    setCurrentChunk(0);
    setTotalChunks(1);
    setProcessedRows(0);
  }

  function openDialog() {
    reset();
    setSources(initialSources);
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

  function goBack() {
    setStage("upload");
    setPreviewData(null);
    setSelectedSourceId("");
    setNewSourceName("");
    setError(null);
  }

  async function advance() {
    if (!file) return;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await previewImportAction(null, formData);
    setIsSubmitting(false);

    if (response.error || !response.preview) {
      setError(response.error ?? "Erro ao ler o arquivo.");
      return;
    }

    setPreviewData(response.preview);
    setStage("preview");
  }

  async function createSourceAndSelect() {
    const name = capitalizeFirst(newSourceName);
    if (name.length < 2) return;

    setCreatingSource(true);
    const formData = new FormData();
    formData.set("name", name);

    const result = await createContactSource(undefined, formData);
    setCreatingSource(false);

    if (result.error || !("source" in result) || !result.source) {
      toast.error(result.error ?? "Erro ao criar origem.");
      return;
    }

    const created = result.source as ContactSource;
    setSources((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedSourceId(created.id);
    setNewSourceName("");
    toast.success(`Origem "${created.name}" criada!`);
  }

  async function submit() {
    if (!file || !previewData) return;
    if (!previewData.hasOriginColumn && !selectedSourceId) return;

    const totalRows  = previewData.totalDataRows;
    const chunks     = Math.max(1, Math.ceil(totalRows / MAX_IMPORT_ROWS));

    setTotalChunks(chunks);
    setCurrentChunk(0);
    setProcessedRows(0);
    setIsSubmitting(true);
    setError(null);

    const aggregated: ContactImportResult = { total: totalRows, created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < chunks; i++) {
      setCurrentChunk(i + 1);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("offset",     String(i * MAX_IMPORT_ROWS));
      formData.append("chunk_size", String(MAX_IMPORT_ROWS));
      if (selectedSourceId) formData.append("fallback_source_id", selectedSourceId);

      const response = await importContactsAction(null, formData);

      if (response.error) {
        setError(response.error);
        setIsSubmitting(false);
        return;
      }

      const r = response.result!;
      aggregated.created += r.created;
      aggregated.skipped += r.skipped;
      aggregated.errors.push(...r.errors);
      setProcessedRows(Math.min((i + 1) * MAX_IMPORT_ROWS, totalRows));
    }

    toast.success(
      `Importação concluída: ${aggregated.created.toLocaleString("pt-BR")} criado(s), ${aggregated.skipped.toLocaleString("pt-BR")} ignorado(s).`
    );

    setResult(aggregated);
    setStage("result");
    setIsSubmitting(false);
    onImported();
  }

  return {
    open,
    stage,
    file,
    isSubmitting,
    result,
    error,
    previewData,
    sources,
    selectedSourceId,
    setSelectedSourceId,
    newSourceName,
    setNewSourceName,
    creatingSource,
    createSourceAndSelect,
    currentChunk,
    totalChunks,
    processedRows,
    openDialog,
    closeDialog,
    selectFile,
    advance,
    goBack,
    submit,
  };
}
