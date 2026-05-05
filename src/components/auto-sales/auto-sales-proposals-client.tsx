"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutoSalesProposal } from "@/types";

const STATUS = {
  draft:    { label: "Rascunho",  variant: "secondary" as const },
  sent:     { label: "Enviada",   variant: "default" as const },
  accepted: { label: "Aceita",    variant: "default" as const },
  rejected: { label: "Recusada",  variant: "destructive" as const },
  expired:  { label: "Expirada",  variant: "outline" as const },
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props { proposals: AutoSalesProposal[]; workspaceId: string; }

export function AutoSalesProposalsClient({ proposals }: Props) {
  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhuma proposta encontrada.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {proposals.map(p => {
        const s = STATUS[p.status] ?? STATUS.draft;
        return (
          <Card key={p.id} className="rounded-xl border border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono text-muted-foreground">
                  #{p.id.slice(0, 8).toUpperCase()}
                </CardTitle>
                <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-1 text-xs text-muted-foreground">
              {p.final_price && <p className="text-base font-bold text-foreground">{fmt(p.final_price)}</p>}
              {p.financing_months && <p>Financiamento: {p.financing_months}x</p>}
              {p.trade_in_plate && <p>Trade-in: {p.trade_in_plate}</p>}
              <p>{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
