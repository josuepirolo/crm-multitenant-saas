"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { LeadFilters } from "@/repositories/lead.repository";
import type { ContactStatus } from "@/types";

const STATUSES: { value: ContactStatus | "all"; label: string }[] = [
  { value: "all",      label: "Todos" },
  { value: "lead",     label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Cliente" },
  { value: "churned",  label: "Inativo" },
];

interface LeadFiltersProps {
  filters: LeadFilters;
  onChange: (next: Partial<LeadFilters>) => void;
}

export function LeadFiltersBar({ filters, onChange }: LeadFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value })}
          className="h-9 w-full rounded-xl border border-border/60 bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {filters.search && (
          <button
            onClick={() => { onChange({ search: "" }); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ status: value })}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-all duration-150",
              filters.status === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
