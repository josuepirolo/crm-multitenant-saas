"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserCheck, Briefcase } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { MemberRole, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";
import { appleEase } from "@/components/ui/motion";

const ROLE_COLORS: Record<MemberRole, string> = {
  owner:   "bg-primary/10 text-primary",
  admin:   "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  manager: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  sales:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  support: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

interface WorkspaceDetailPanelProps {
  workspace: WorkspaceWithStats | null;
  members: WorkspaceMemberWithProfile[];
  loading: boolean;
  onClose: () => void;
}

export function WorkspaceDetailPanel({ workspace, members, loading, onClose }: WorkspaceDetailPanelProps) {
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <AnimatePresence>
      {workspace && (
        <motion.div
          key="panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: appleEase }}
          className="w-80 shrink-0 border-l border-border/50 bg-card flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border/50 gap-3">
            <div className="min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mb-3">
                {workspace.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-semibold truncate">{workspace.name}</h3>
              <p className="text-xs text-muted-foreground">{workspace.slug}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
            {[
              { icon: Users,     label: "Membros",  value: workspace.member_count },
              { icon: UserCheck, label: "Contatos", value: workspace.contact_count },
              { icon: Briefcase, label: "Deals",    value: workspace.deal_count },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-4">
                <Icon size={15} className="text-muted-foreground" />
                <span className="text-lg font-bold tabular-nums">{fmt(value)}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto">
            <p className="px-5 py-3 text-xs font-medium text-muted-foreground border-b border-border/50">
              Membros ativos
            </p>

            {loading ? (
              <div className="divide-y divide-border/50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sem membros.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {members.map((m) => {
                  const name = m.profiles?.name ?? "Sem nome";
                  const initials = name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.profiles?.email ?? "—"}</p>
                      </div>
                      <span className={cn("shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", ROLE_COLORS[m.role])}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 text-xs text-muted-foreground">
            Criado em {new Date(workspace.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
