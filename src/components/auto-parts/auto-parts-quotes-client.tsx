"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutoPartsQuote } from "@/types";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:    { label: "Rascunho",  variant: "secondary" },
  sent:     { label: "Enviado",   variant: "default" },
  approved: { label: "Aprovado",  variant: "default" },
  rejected: { label: "Recusado",  variant: "destructive" },
  expired:  { label: "Expirado",  variant: "outline" },
};

interface Props { quotes: AutoPartsQuote[]; workspaceId: string; }

export function AutoPartsQuotesClient({ quotes }: Props) {
  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhum orçamento encontrado.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map(q => {
        const s = STATUS_LABEL[q.status] ?? STATUS_LABEL.draft;
        return (
          <Card key={q.id} className="rounded-xl border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono text-muted-foreground truncate">
                  #{q.id.slice(0, 8).toUpperCase()}
                </CardTitle>
                <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              {new Date(q.created_at).toLocaleDateString("pt-BR")}
              {q.notes && <p className="mt-1 line-clamp-2">{q.notes}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
