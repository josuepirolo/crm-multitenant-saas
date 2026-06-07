"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  lowStock: any[];
  workspaceId: string;
}

export function FashionStockClient({ lowStock }: Props) {
  if (lowStock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Estoque dentro do esperado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Mín</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lowStock.map((row: any) => (
            <TableRow key={`${row.variant_id}`}>
              <TableCell className="font-medium text-sm">{row.variant?.product?.name ?? "—"}</TableCell>
              <TableCell className="text-sm">{row.variant?.color}</TableCell>
              <TableCell className="text-sm">{row.variant?.size}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.variant?.sku}</TableCell>
              <TableCell className="text-right text-sm font-semibold">{row.quantity}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">{row.min_stock}</TableCell>
              <TableCell>
                {row.quantity === 0
                  ? <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                  : <Badge variant="outline" className="text-xs text-warning border-warning/40">Baixo</Badge>
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
