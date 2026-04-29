"use client";

/**
 * Componente reutilizável de endereço com lookup automático por CEP.
 * O CEP é consultado via /api/address/cep (backend) — nunca direto ao ViaCEP.
 *
 * Usage:
 *   <AddressFields
 *     values={addressValues}
 *     onChange={(field, value) => setValue(`prefix_${field}`, value, { shouldDirty: true })}
 *     disabled={!canEdit}
 *   />
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface AddressValue {
  zipcode:    string;
  street:     string;
  number:     string;
  complement: string;
  district:   string;
  city:       string;
  state:      string;
  country:    string;
}

interface AddressFieldsProps {
  values:   Partial<AddressValue>;
  onChange: (field: keyof AddressValue, value: string) => void;
  disabled?: boolean;
  errors?:  Partial<Record<keyof AddressValue, string>>;
}

interface CepPayload {
  found:      boolean;
  street?:    string;
  complement?: string;
  district?:  string;
  city?:      string;
  state?:     string;
}

export function AddressFields({ values, onChange, disabled, errors }: AddressFieldsProps) {
  const [lookingUp, setLookingUp] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "not_found" | "error">("idle");

  async function handleCepBlur(rawCep: string) {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setLookingUp(true);
    setCepStatus("idle");

    try {
      const res = await fetch(`/api/address/cep?cep=${cep}`);

      if (res.status === 400 || res.status === 429) {
        setLookingUp(false);
        return;
      }

      const data: CepPayload = await res.json();

      if (!data.found) {
        setCepStatus("not_found");
        return;
      }

      // Preenche apenas campos retornados pela API; número permanece manual
      if (data.street)     onChange("street",     data.street);
      if (data.complement) onChange("complement", data.complement);
      if (data.district)   onChange("district",   data.district);
      if (data.city)       onChange("city",       data.city);
      if (data.state)      onChange("state",      data.state);
      onChange("country", "BR");
    } catch {
      setCepStatus("error");
    } finally {
      setLookingUp(false);
    }
  }

  function field(key: keyof AddressValue) {
    return {
      value:    values[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value),
      disabled: disabled || (lookingUp && key !== "number" && key !== "zipcode"),
    };
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
      {/* CEP */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">CEP</Label>
          <div className="relative">
            <Input
              {...field("zipcode")}
              disabled={disabled}
              placeholder="00000-000"
              className="h-9 rounded-lg border-border/60 text-sm pr-7"
              onBlur={(e) => handleCepBlur(e.target.value)}
            />
            {lookingUp && (
              <Loader2 size={13} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {errors?.zipcode && <p className="text-xs text-destructive">{errors.zipcode}</p>}
        </div>

        {cepStatus === "not_found" && (
          <p className="col-span-2 self-end pb-1.5 text-xs text-muted-foreground">
            CEP não encontrado — preencha os campos manualmente.
          </p>
        )}
        {cepStatus === "error" && (
          <p className="col-span-2 self-end pb-1.5 text-xs text-muted-foreground">
            Não foi possível consultar o CEP — preencha manualmente.
          </p>
        )}
      </div>

      {/* Rua + Número */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Rua / Avenida</Label>
          <Input {...field("street")} className="h-9 rounded-lg border-border/60 text-sm" />
          {errors?.street && <p className="text-xs text-destructive">{errors.street}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Número</Label>
          <Input {...field("number")} disabled={disabled} className="h-9 rounded-lg border-border/60 text-sm" />
          {errors?.number && <p className="text-xs text-destructive">{errors.number}</p>}
        </div>
      </div>

      {/* Complemento + Bairro */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Complemento</Label>
          <Input {...field("complement")} placeholder="Sala, andar..." className="h-9 rounded-lg border-border/60 text-sm" />
          {errors?.complement && <p className="text-xs text-destructive">{errors.complement}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bairro</Label>
          <Input {...field("district")} className="h-9 rounded-lg border-border/60 text-sm" />
          {errors?.district && <p className="text-xs text-destructive">{errors.district}</p>}
        </div>
      </div>

      {/* Cidade + Estado */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Cidade</Label>
          <Input {...field("city")} className="h-9 rounded-lg border-border/60 text-sm" />
          {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Estado</Label>
          <Input
            {...field("state")}
            placeholder="SP"
            maxLength={2}
            className="h-9 rounded-lg border-border/60 text-sm uppercase"
          />
          {errors?.state && <p className="text-xs text-destructive">{errors.state}</p>}
        </div>
      </div>
    </div>
  );
}
