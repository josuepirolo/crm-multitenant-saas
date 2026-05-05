"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutoPartsCatalog, VehicleModel } from "@/types";

interface Props {
  parts: AutoPartsCatalog[];
  models: VehicleModel[];
  workspaceId: string;
}

export function AutoPartsCatalogClient({ parts, models, workspaceId }: Props) {
  const [search, setSearch] = useState("");

  const filtered = parts.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.part_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome ou código..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma peça encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(part => (
            <Card key={part.id} className="rounded-xl border border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-tight">{part.name}</CardTitle>
                  {part.color && (
                    <Badge variant="outline" className="text-xs shrink-0">{part.color}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{part.part_number}</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <Badge variant="secondary" className="text-xs">{part.category}</Badge>
                {part.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{part.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
