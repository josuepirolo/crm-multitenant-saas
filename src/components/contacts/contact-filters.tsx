"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ContactFilters } from "@/repositories/contact.repository";
import type { ContactStatus, WorkspaceMemberWithProfile } from "@/types";

const STATUSES: { value: ContactStatus | "all"; label: string }[] = [
  { value: "all",      label: "Todos" },
  { value: "lead",     label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Cliente" },
  { value: "churned",  label: "Inativo" },
];

interface ContactFiltersBarProps {
  filters: ContactFilters;
  onChange: (next: Partial<ContactFilters>) => void;
  isManager?: boolean;
  members?: WorkspaceMemberWithProfile[];
}

export function ContactFiltersBar({ filters, onChange, isManager, members = [] }: ContactFiltersBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState(filters.search ?? "");

  useEffect(() => {
    if (searchValue === (filters.search ?? "")) return;
    const timer = setTimeout(() => onChange({ search: searchValue }), 300);
    return () => clearTimeout(timer);
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() {
    setSearchValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-9 w-full rounded-xl border border-border/60 bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

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

      {isManager && members.length > 0 && (
        <Select
          value={filters.assignedTo ?? "all"}
          onValueChange={(v) => onChange({ assignedTo: (v ?? "all") as ContactFilters["assignedTo"] })}
        >
          <SelectTrigger className="h-9 w-44 rounded-xl border-border/60 text-sm focus:ring-primary/30">
            <SelectValue placeholder="Responsável..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {members.map((m) => {
              const name = m.profiles?.name ?? m.profiles?.email ?? "Membro";
              return (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
