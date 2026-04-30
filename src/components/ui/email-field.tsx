"use client";

/**
 * Campo de e-mail com validação inline no blur.
 *
 * Usage:
 *   <EmailField value={watch("email")} onChange={(v) => setValue("email", v)} />
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailFieldProps {
  value:       string;
  onChange:    (value: string) => void;
  disabled?:   boolean;
  error?:      string;
  label?:      string;
  placeholder?: string;
}

export function EmailField({
  value, onChange, disabled, error, label = "E-mail", placeholder = "nome@empresa.com",
}: EmailFieldProps) {
  const [touched, setTouched] = useState(false);

  const localError = touched && value.trim() && !EMAIL_RE.test(value.trim())
    ? "E-mail inválido."
    : undefined;

  const displayError = error ?? localError;

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        placeholder={placeholder}
        className={`h-10 w-full rounded-xl border bg-background px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          displayError ? "border-destructive focus:ring-destructive" : "border-border/60"
        }`}
      />
      {displayError && <p className="text-xs text-destructive">{displayError}</p>}
    </div>
  );
}
