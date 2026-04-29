"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRef, useState, useTransition } from "react";
import { Upload, ImageOff } from "lucide-react";
import { updateWorkspaceProfile } from "@/app/(dashboard)/settings/actions";
import { uploadWorkspaceLogo } from "@/app/(dashboard)/settings/upload-actions";
import { updateWorkspaceProfileSchema, type UpdateWorkspaceProfileValues } from "@/lib/validations/workspace";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddressFields, type AddressValue } from "@/components/ui/address-fields";
import { DocumentField } from "@/components/ui/document-field";
import type { Workspace } from "@/types";

interface WorkspaceProfileFormProps {
  workspace: Workspace;
  canEdit: boolean;
  onUpdated: (workspace: Workspace) => void;
}

export function WorkspaceProfileForm({ workspace, canEdit, onUpdated }: WorkspaceProfileFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(workspace.logo_url);
  const [uploadingLogo, startUploadLogo] = useTransition();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } =
    useForm<UpdateWorkspaceProfileValues>({
      resolver: zodResolver(updateWorkspaceProfileSchema),
      defaultValues: {
        display_name:       workspace.display_name       ?? "",
        legal_name:         workspace.legal_name         ?? "",
        document:           workspace.document           ?? "",
        phone:              workspace.phone              ?? "",
        email:              workspace.email              ?? "",
        address_street:     workspace.address_street     ?? "",
        address_number:     workspace.address_number     ?? "",
        address_complement: workspace.address_complement ?? "",
        address_district:   workspace.address_district   ?? "",
        address_city:       workspace.address_city       ?? "",
        address_state:      workspace.address_state      ?? "",
        address_zipcode:    workspace.address_zipcode    ?? "",
        address_country:    workspace.address_country    ?? "BR",
      },
    });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    startUploadLogo(async () => {
      const fd = new FormData();
      fd.append("file", file);

      const promise = uploadWorkspaceLogo(null, fd).then((r) => {
        if (r.error) throw new Error(r.error);
        if ("workspace" in r && r.workspace) onUpdated(r.workspace);
        return r;
      });

      toast.promise(promise, {
        loading: "Enviando logo...",
        success: "Logo atualizada!",
        error:   (err: Error) => err.message,
      });

      try {
        await promise;
      } catch {
        URL.revokeObjectURL(previewUrl);
        setLogoPreview(workspace.logo_url);
      }
    });
  }

  async function onSubmit(values: UpdateWorkspaceProfileValues) {
    const fd = new FormData();
    (Object.entries(values) as [string, unknown][]).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });

    const promise = updateWorkspaceProfile(null, fd).then((r) => {
      if (r.error) throw new Error(r.error);
      if ("workspace" in r && r.workspace) onUpdated(r.workspace);
      return r;
    });

    toast.promise(promise, {
      loading: "Salvando...",
      success: "Dados atualizados!",
      error:   (err: Error) => err.message,
    });

    try { await promise; } catch { /* handled by toast */ }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold">Dados da empresa</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Informações públicas e cadastrais</p>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl border border-border/60 bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ImageOff size={20} className="text-muted-foreground" />
            )}
          </div>
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload size={14} />
                  {uploadingLogo ? "Enviando..." : "Alterar logo"}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · máx 5 MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Nome de exibição */}
        <div className="space-y-1.5">
          <Label>Nome de exibição</Label>
          <Input
            {...register("display_name")}
            disabled={!canEdit}
            className="h-10 rounded-xl border-border/60"
            placeholder={workspace.name}
          />
          {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          <p className="text-xs text-muted-foreground">Exibido para clientes. Se vazio, usa o nome interno.</p>
        </div>

        {/* Razão social + documento */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Razão social</Label>
            <Input {...register("legal_name")} disabled={!canEdit} className="h-10 rounded-xl border-border/60" />
            {errors.legal_name && <p className="text-xs text-destructive">{errors.legal_name.message}</p>}
          </div>
          <DocumentField
            value={watch("document") ?? ""}
            onChange={(v) => setValue("document", v, { shouldDirty: true })}
            disabled={!canEdit}
            error={errors.document?.message}
          />
        </div>

        {/* Contato */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              {...register("phone")}
              disabled={!canEdit}
              className="h-10 rounded-xl border-border/60"
              placeholder="(11) 99999-9999"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>E-mail da empresa</Label>
            <Input
              {...register("email")}
              type="email"
              disabled={!canEdit}
              className="h-10 rounded-xl border-border/60"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Endereço</Label>
          <AddressFields
            values={{
              zipcode:    watch("address_zipcode")    ?? "",
              street:     watch("address_street")     ?? "",
              number:     watch("address_number")     ?? "",
              complement: watch("address_complement") ?? "",
              district:   watch("address_district")   ?? "",
              city:       watch("address_city")       ?? "",
              state:      watch("address_state")      ?? "",
              country:    watch("address_country")    ?? "BR",
            }}
            onChange={(field, value) =>
              setValue(`address_${field}` as keyof UpdateWorkspaceProfileValues, value, { shouldDirty: true })
            }
            disabled={!canEdit}
            errors={{
              zipcode:    errors.address_zipcode?.message,
              street:     errors.address_street?.message,
              number:     errors.address_number?.message,
              complement: errors.address_complement?.message,
              district:   errors.address_district?.message,
              city:       errors.address_city?.message,
              state:      errors.address_state?.message,
            }}
          />
        </div>

        {canEdit && (
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-xl"
          >
            {isSubmitting ? "Salvando..." : "Salvar dados da empresa"}
          </Button>
        )}
      </form>
    </div>
  );
}
