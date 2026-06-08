"use client";

import { CheckCircle2, AlertTriangle, SkipForward, ListChecks } from "lucide-react";
import type { ContactImportResult } from "@/types";

interface ImportResultSummaryProps {
  result: ContactImportResult;
}

export function ImportResultSummary({ result }: ImportResultSummaryProps) {
  const cards = [
    { label: "Processadas", value: result.total, icon: ListChecks, tone: "text-foreground" },
    { label: "Criadas", value: result.created, icon: CheckCircle2, tone: "text-primary" },
    { label: "Ignoradas", value: result.skipped, icon: SkipForward, tone: "text-muted-foreground" },
    { label: "Com erro", value: result.errors.length, icon: AlertTriangle, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-muted/30 px-3 py-4 text-center"
          >
            <Icon size={16} className={tone} />
            <span className={`text-lg font-semibold ${tone}`}>{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {result.errors.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Linhas com problema</p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border/50">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Linha</th>
                  <th className="px-3 py-2 text-left font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {result.errors.map((err) => (
                  <tr key={err.row}>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">{err.row}</td>
                    <td className="px-3 py-1.5 text-foreground">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma linha apresentou erro de validação.</p>
      )}
    </div>
  );
}
