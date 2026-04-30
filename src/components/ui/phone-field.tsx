"use client";

/**
 * Campo de telefone brasileiro com:
 * - Máscara automática: (XX) XXXX-XXXX (fixo) ou (XX) XXXXX-XXXX (celular)
 * - Ícone verde (WhatsApp) para celular; ícone cinza (telefone) para fixo
 * - Compatível com react-hook-form via value/onChange
 *
 * Usage:
 *   <PhoneField value={watch("phone")} onChange={(v) => setValue("phone", v)} />
 */

import { Phone } from "lucide-react";
import { Label } from "@/components/ui/label";

interface PhoneFieldProps {
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
  error?:    string;
  label?:    string;
}

function stripPhone(v: string) {
  return v.replace(/\D/g, "");
}

function maskPhone(raw: string): string {
  const d = stripPhone(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function phoneType(raw: string): "mobile" | "landline" | null {
  const d = stripPhone(raw);
  if (d.length === 11) return "mobile";
  if (d.length === 10) return "landline";
  return null;
}

// SVG mínimo do ícone do WhatsApp (paths oficiais simplificados)
function WhatsAppIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.215a.75.75 0 0 0 .928.928l5.357-1.476A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.68-.513-5.208-1.408l-.374-.218-3.878 1.068 1.068-3.878-.218-.374A9.953 9.953 0 0 1 2 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
    </svg>
  );
}

export function PhoneField({
  value, onChange, disabled, error, label = "Telefone",
}: PhoneFieldProps) {
  const type     = phoneType(value);
  const isMobile = type === "mobile";
  const display  = maskPhone(value);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="tel"
          value={display}
          onChange={(e) => onChange(maskPhone(e.target.value))}
          disabled={disabled}
          inputMode="numeric"
          placeholder="(11) 99999-9999"
          maxLength={15}
          className={`h-10 w-full rounded-xl border bg-background pl-3 pr-9 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? "border-destructive" : "border-border/60"
          }`}
        />

        {/* Indicador de tipo à direita */}
        {type && (
          <div
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            title={isMobile ? "Celular (WhatsApp)" : "Telefone fixo"}
          >
            {isMobile ? (
              <span className="text-[#25D366]">
                <WhatsAppIcon size={15} />
              </span>
            ) : (
              <Phone size={14} className="text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {type && (
        <p className="text-xs text-muted-foreground">
          {isMobile ? "Celular — compatível com WhatsApp" : "Telefone fixo"}
        </p>
      )}
    </div>
  );
}
