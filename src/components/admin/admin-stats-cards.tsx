"use client";

import { Building2, Users, UserCheck, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminGlobalStats } from "@/types";

const CARDS = [
  { key: "total_workspaces", label: "Workspaces",  icon: Building2, color: "text-primary",   bg: "bg-primary/10"    },
  { key: "total_members",    label: "Usuários",     icon: Users,     color: "text-violet-500", bg: "bg-violet-500/10" },
  { key: "total_contacts",   label: "Contatos",     icon: UserCheck, color: "text-emerald-500",bg: "bg-emerald-500/10"},
  { key: "total_deals",      label: "Negociações",  icon: Briefcase, color: "text-amber-500",  bg: "bg-amber-500/10"  },
] as const;

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

interface AdminStatsCardsProps {
  stats: AdminGlobalStats | null;
  loading: boolean;
}

export function AdminStatsCards({ stats, loading }: AdminStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {(stats?.[key] ?? 0).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}
