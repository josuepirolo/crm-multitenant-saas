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

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } =
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
          <div className="space-y-1.5">
            <Label>CNPJ / CPF</Label>
            <Input
              {...register("document")}
              disabled={!canEdit}
              className="h-10 rounded-xl border-border/60"
              placeholder="00.000.000/0001-00"
            />
            {errors.document && <p className="text-xs text-destructive">{errors.document.message}</p>}
          </div>
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
          <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Rua / Avenida</Label>
                <Input {...register("address_street")} disabled={!canEdit} className="h-9 rounded-lg border-border/60 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número</Label>
                <Input {...register("address_number")} disabled={!canEdit} className="h-9 rounded-lg border-border/60 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Complemento</Label>
                <Input
                  {...register("address_complement")}
                  disabled={!canEdit}
                  className="h-9 rounded-lg border-border/60 text-sm"
                  placeholder="Sala, andar..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bairro</Label>
                <Input {...register("address_district")} disabled={!canEdit} className="h-9 rounded-lg border-border/60 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CEP</Label>
                <Input
                  {...register("address_zipcode")}
                  disabled={!canEdit}
                  className="h-9 rounded-lg border-border/60 text-sm"
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Input {...register("address_city")} disabled={!canEdit} className="h-9 rounded-lg border-border/60 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Input
                  {...register("address_state")}
                  disabled={!canEdit}
                  className="h-9 rounded-lg border-border/60 text-sm"
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
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
