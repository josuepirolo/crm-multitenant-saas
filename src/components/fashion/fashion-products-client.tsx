"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FashionProduct } from "@/types";

const GENDER_LABEL = { feminino: "Feminino", masculino: "Masculino", infantil: "Infantil", unissex: "Unissex" };

interface Props { products: FashionProduct[]; workspaceId: string; }

export function FashionProductsClient({ products }: Props) {
  const [search, setSearch] = useState("");

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar produto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(p => (
            <Card key={p.id} className="rounded-xl border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold leading-tight">{p.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {GENDER_LABEL[p.gender] ?? p.gender}
                </Badge>
                {p.brand && <Badge variant="outline" className="text-xs">{p.brand}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
