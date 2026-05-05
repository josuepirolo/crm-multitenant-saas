"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  nicheSlug?: string | null;
  register: (name: string) => object;
}

export function ContactNicheFields({ nicheSlug, register }: Props) {
  if (!nicheSlug) return null;

  if (nicheSlug.startsWith("auto-parts")) {
    return (
      <div className="space-y-3 pt-2 border-t border-border/50">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Perfil Auto Peças
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tipo de empresa</Label>
            <Input
              placeholder="Transportadora, oficina..."
              {...register("niche_company_type")}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tamanho da frota</Label>
            <Input
              type="number"
              placeholder="0"
              {...register("niche_fleet_size")}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Segmento principal</Label>
          <select
            {...register("niche_segment")}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecionar...</option>
            <option value="heavy">Linha Pesada</option>
            <option value="light">Linha Leve</option>
            <option value="agro">Agrícola</option>
            <option value="moto">Motocicletas</option>
          </select>
        </div>
      </div>
    );
  }

  if (nicheSlug.startsWith("moda")) {
    return (
      <div className="space-y-3 pt-2 border-t border-border/50">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Perfil Moda
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Blusa</Label>
            <Input
              placeholder="M"
              {...register("niche_shirt_size")}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Calça</Label>
            <Input
              placeholder="40"
              {...register("niche_pants_size")}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Calçado</Label>
            <Input
              placeholder="37"
              {...register("niche_shoe_size")}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
