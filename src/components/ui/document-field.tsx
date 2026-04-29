"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { maskDocument, stripDocument, validateDocument, documentType } from "@/lib/validations/document";

interface DocumentFieldProps {
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
  error?:    string;
  label?:    string;
}

export function DocumentField({
  value, onChange, disabled, error, label = "CPF / CNPJ",
}: DocumentFieldProps) {
  const [touched, setTouched] = useState(false);

  const digits   = stripDocument(value);
  const type     = documentType(value);
  const isValid  = digits.length === 0 || validateDocument(value);
  const showError = touched && digits.length > 0 && !isValid;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw    = e.target.value;
    const masked = maskDocument(raw);
    onChange(masked);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {type && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {type.toUpperCase()}
          </span>
        )}
      </div>

      <Input
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
        inputMode="numeric"
        className={`h-10 rounded-xl border-border/60 ${showError ? "border-destructive focus-visible:ring-destructive" : ""}`}
      />

      {(error || showError) && (
        <p className="text-xs text-destructive">
          {error ?? (type === "cpf" ? "CPF inválido." : type === "cnpj" ? "CNPJ inválido." : "Documento inválido.")}
        </p>
      )}
    </div>
  );
}
