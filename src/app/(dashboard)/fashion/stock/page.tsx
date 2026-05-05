import { getWorkspaceContext } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import { SupabaseFashionRepository } from "@/repositories/fashion.repository";
import { ListLowStockUseCase } from "@/usecases/FashionUseCases";
import { FashionStockClient } from "@/components/fashion/fashion-stock-client";

export default async function FashionStockPage() {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return <div className="p-8 text-destructive">{ctx.error}</div>;

  const supabase = await createClient();
  const repo = new SupabaseFashionRepository(supabase);
  const lowStock = await new ListLowStockUseCase(repo).execute(ctx.workspaceId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Estoque</h1>
        {lowStock.length > 0 && (
          <p className="text-sm text-destructive mt-1 font-medium">
            {lowStock.length} {lowStock.length === 1 ? "variante abaixo" : "variantes abaixo"} do estoque mínimo
          </p>
        )}
      </div>
      <FashionStockClient lowStock={lowStock} workspaceId={ctx.workspaceId} />
    </div>
  );
}
