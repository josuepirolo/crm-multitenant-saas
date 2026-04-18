import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accent?: "primary" | "green" | "amber" | "purple";
}

const accents = {
  primary: "bg-primary/10 text-primary",
  green:   "bg-emerald-500/10 text-emerald-500",
  amber:   "bg-amber-500/10 text-amber-500",
  purple:  "bg-violet-500/10 text-violet-500",
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, accent = "primary" }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accents[accent])}>
          <Icon size={18} />
        </div>
      </div>

      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-medium",
            trend.value >= 0 ? "text-emerald-500" : "text-destructive"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
