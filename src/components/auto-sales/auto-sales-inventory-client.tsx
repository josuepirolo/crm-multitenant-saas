"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutoSalesInventory } from "@/types";

const CONDITION_LABEL = { new: "Novo", used: "Usado", certified: "Certificado" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props { inventory: AutoSalesInventory[]; workspaceId: string; }

export function AutoSalesInventoryClient({ inventory }: Props) {
  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhum veículo no estoque.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {inventory.map(v => (
        <Card key={v.id} className="rounded-xl border border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {(v.model as any)?.brand?.name} {(v.model as any)?.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{v.year_model} · {v.trim ?? "—"}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {CONDITION_LABEL[v.condition]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">{v.color}</Badge>
              <Badge variant="secondary" className="text-xs">{v.mileage_km.toLocaleString("pt-BR")} km</Badge>
              {v.has_sinistro && <Badge variant="destructive" className="text-xs">Sinistro</Badge>}
              {v.accepts_financing && <Badge variant="outline" className="text-xs">Financ.</Badge>}
            </div>
            {v.pricing && (
              <p className="text-base font-bold text-primary">{fmt(v.pricing.offer_price)}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
