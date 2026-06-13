"use client";

import { CheckCircle2, AlertTriangle, RefreshCw, FileX, Copy, ListChecks } from "lucide-react";
import type { ContactImportResult } from "@/types";

interface ImportResultSummaryProps {
  result: ContactImportResult;
}

export function ImportResultSummary({ result }: ImportResultSummaryProps) {
  const cards = [
    { label: "Processadas",  value: result.total,          icon: ListChecks,   tone: "text-foreground" },
    { label: "Criadas",      value: result.created,        icon: CheckCircle2, tone: "text-primary" },
    { label: "Já existiam",  value: result.already_exists, icon: RefreshCw,    tone: "text-amber-500" },
    { label: "Inválidas",    value: result.invalid_count,  icon: FileX,        tone: "text-destructive" },
  ];

  const fileDuplicates = result.file_duplicates ?? 0;

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

      {fileDuplicates > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Copy size={14} className="shrink-0" />
          <span>{fileDuplicates.toLocaleString("pt-BR")} linha(s) duplicada(s) dentro da própria planilha foram ignoradas.</span>
        </div>
      )}

      {result.already_exists > 0 && result.created === 0 && result.invalid_count === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <RefreshCw size={14} className="shrink-0" />
          <span>Todos os contatos desta planilha já existem na base. Nenhum foi criado novamente.</span>
        </div>
      )}

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
        result.created > 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma linha apresentou erro de validação.</p>
        )
      )}
    </div>
  );
}
