"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { appleEase } from "@/components/ui/motion";
import { createDealSchema, updateDealSchema } from "@/lib/validations/deal";
import type { Stage } from "@/types";
import type { DealWithContact, ContactForSelect } from "@/repositories/deal.repository";
import type { CreateDealInput, UpdateDealInput } from "@/lib/validations/deal";

interface DealDialogProps {
  open: boolean;
  deal?: DealWithContact | null;
  stageId: string | null;
  pipelineId: string;
  stages: Stage[];
  contacts: ContactForSelect[];
  onClose: () => void;
  onSave: (input: CreateDealInput | UpdateDealInput) => Promise<void>;
}

type FormValues = {
  title: string;
  value: string;
  expected_close_date: string;
  contact_id: string;
  stage_id: string;
};

export function DealDialog({
  open, deal, stageId, pipelineId, stages, contacts, onClose, onSave,
}: DealDialogProps) {
  const isEdit = !!deal;
  const schema = isEdit ? updateDealSchema : createDealSchema;

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: { title: "", value: "", expected_close_date: "", contact_id: "", stage_id: stageId ?? "" },
    });

  useEffect(() => {
    if (!open) return;
    if (deal) {
      reset({
        title:               deal.title,
        value:               deal.value != null ? String(deal.value) : "",
        expected_close_date: deal.expected_close_date ?? "",
        contact_id:          deal.contact_id ?? "",
        stage_id:            deal.stage_id,
      });
    } else {
      reset({ title: "", value: "", expected_close_date: "", contact_id: "", stage_id: stageId ?? "" });
    }
  }, [open, deal, stageId, reset]);

  async function onSubmit(values: FormValues) {
    const base = {
      title:               values.title,
      value:               values.value ? Number(values.value) : undefined,
      contact_id:          values.contact_id || null,
      expected_close_date: values.expected_close_date || null,
    };

    const input: CreateDealInput | UpdateDealInput = isEdit
      ? { ...base, deal_id: deal!.id }
      : { ...base, pipeline_id: pipelineId, stage_id: values.stage_id };

    try {
      await toast.promise(onSave(input), {
        loading: isEdit ? "Salvando..." : "Criando negociação...",
        success: isEdit ? "Negociação atualizada!" : "Negociação criada!",
        error: (e: Error) => e?.message ?? "Erro ao salvar.",
      });
    } catch {
      // error handled by toast.promise
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <ModalOverlay onClick={onClose} />
          <motion.div
            key="deal-dialog"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: appleEase }}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-2xl bg-card border border-border shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">
                {isEdit ? "Editar Negociação" : "Nova Negociação"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col gap-5 p-6">
              {/* Stage selector (create only) */}
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="stage_id">Etapa</Label>
                  <select
                    id="stage_id"
                    {...register("stage_id")}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Proposta para Empresa X"
                  {...register("title")}
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Value + Date (side by side) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    {...register("value")}
                  />
                  {errors.value && (
                    <p className="text-xs text-destructive">{errors.value.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expected_close_date">Previsão de fechamento</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    {...register("expected_close_date")}
                  />
                </div>
              </div>

              {/* Contact */}
              {contacts.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="contact_id">Contato</Label>
                  <Controller
                    name="contact_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="contact_id"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      >
                        <option value="">Nenhum contato</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.phone ? ` · ${c.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                  {isSubmitting ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
