"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceWithStats } from "@/types";
import type { AdminTab } from "@/viewmodels/useAdminViewModel";

function WorkspacesTableSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="h-9 w-9 rounded-xl bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex gap-6">
            {[1,2,3].map((j) => (
              <div key={j} className="space-y-1 text-right">
                <div className="h-4 w-8 rounded bg-muted animate-pulse ml-auto" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface WorkspacesTableProps {
  workspaces: WorkspaceWithStats[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onSelectWorkspace: (ws: WorkspaceWithStats) => void;
  selectedId?: string;
  activeTab?: AdminTab;
}

export function WorkspacesTable({
  workspaces, total, page, pageSize, loading,
  search, onSearchChange, onPageChange, onSelectWorkspace, selectedId, activeTab,
}: WorkspacesTableProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearchChange(localSearch), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const dateStr = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/50">
        <div>
          <h3 className="text-base font-semibold">Workspaces</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{total} no total</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar workspace..."
            className="h-9 w-full rounded-xl border border-border/60 bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-6 py-2.5 bg-muted/30 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground">Workspace</span>
        <span className="text-xs font-medium text-muted-foreground w-16 text-center">Status</span>
        <span className="text-xs font-medium text-muted-foreground w-20 text-right">Membros</span>
        <span className="text-xs font-medium text-muted-foreground w-20 text-right">Contatos</span>
        <span className="text-xs font-medium text-muted-foreground w-20 text-right">Deals</span>
        <span className="text-xs font-medium text-muted-foreground w-28 text-right">Criado em</span>
      </div>

      {/* Rows */}
      {loading ? (
        <WorkspacesTableSkeleton />
      ) : workspaces.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {activeTab === "inactive" ? "Nenhuma empresa inativa." : "Nenhum workspace encontrado."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws)}
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 w-full px-6 py-4 text-left transition-colors hover:bg-muted/40",
                selectedId === ws.id && "bg-primary/5 hover:bg-primary/5"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ws.name}</p>
                  <p className="text-xs text-muted-foreground">{ws.slug}</p>
                </div>
              </div>
              <div className="w-16 flex justify-center">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  ws.is_active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", ws.is_active ? "bg-emerald-500" : "bg-destructive")} />
                  {ws.is_active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <span className="text-sm font-medium w-20 text-right tabular-nums">{fmt(ws.member_count)}</span>
              <span className="text-sm font-medium w-20 text-right tabular-nums">{fmt(ws.contact_count)}</span>
              <span className="text-sm font-medium w-20 text-right tabular-nums">{fmt(ws.deal_count)}</span>
              <span className="text-xs text-muted-foreground w-28 text-right">{dateStr(ws.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
