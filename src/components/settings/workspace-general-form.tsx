"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateWorkspace } from "@/app/(dashboard)/settings/actions";
import { updateWorkspaceSchema, type UpdateWorkspaceFormValues } from "@/lib/validations/workspace";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Workspace } from "@/types";

interface WorkspaceGeneralFormProps {
  workspace: Workspace;
  canEdit: boolean;
  onUpdated: (workspace: Workspace) => void;
}

export function WorkspaceGeneralForm({ workspace, canEdit, onUpdated }: WorkspaceGeneralFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } =
    useForm<UpdateWorkspaceFormValues>({
      resolver: zodResolver(updateWorkspaceSchema),
      defaultValues: { name: workspace.name },
    });

  async function onSubmit(values: UpdateWorkspaceFormValues) {
    const formData = new FormData();
    formData.append("name", values.name);

    const resultPromise = updateWorkspace(null, formData).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(resultPromise, {
      loading: "Salvando...",
      success: "Workspace atualizado!",
      error:   (err: Error) => err.message,
    });

    try {
      const result = await resultPromise;
      if (result.workspace) onUpdated(result.workspace);
    } catch { /* handled by toast */ }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold">Informações gerais</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Nome e identificação do workspace</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label>Nome do workspace</Label>
          <Input
            {...register("name")}
            disabled={!canEdit}
            className="h-10 rounded-xl border-border/60"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Identificador (slug)</Label>
          <Input
            value={workspace.slug}
            disabled
            className="h-10 rounded-xl border-border/60 bg-muted/50 text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">O slug não pode ser alterado após criação.</p>
        </div>

        {canEdit && (
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-xl"
          >
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        )}
      </form>
    </div>
  );
}
