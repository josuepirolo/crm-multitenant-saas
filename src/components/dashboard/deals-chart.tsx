"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DealsByStatus } from "@/repositories/dashboard.repository";

interface DealsChartProps {
  data: DealsByStatus[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Em aberto", color: "var(--color-primary)" },
  won:  { label: "Ganhos",    color: "#10b981" },
  lost: { label: "Perdidos",  color: "var(--color-destructive)" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function DealsChart({ data }: DealsChartProps) {
  const hasData = data.some((d) => d.count > 0);
  const chartData = data.map((d) => ({
    ...d,
    label: STATUS_CONFIG[d.status]?.label ?? d.status,
    color: STATUS_CONFIG[d.status]?.color ?? "#888",
  }));

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Negociações por status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Distribuição das negociações</p>
      </div>

      {!hasData ? (
        <div className="flex h-52 items-center justify-center rounded-xl bg-muted/40">
          <p className="text-sm text-muted-foreground">Nenhuma negociação ainda</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                strokeWidth={2}
                stroke="var(--color-card)"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "var(--color-foreground)",
                }}
                formatter={(value, name, props) => [
                  `${value} negociações — ${formatCurrency(props.payload?.value ?? 0)}`,
                  name,
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 space-y-1.5">
            {chartData.filter(d => d.count > 0).map((d) => (
              <div key={d.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.label}</span>
                </div>
                <span className="font-medium">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
