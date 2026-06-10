import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { SupabaseAutoSalesRepository } from "@/repositories/auto-sales.repository";
import { ListInventoryUseCase } from "@/usecases/AutoSalesUseCases";
import { AutoSalesInventoryClient } from "@/components/auto-sales/auto-sales-inventory-client";

export default async function AutoSalesPage() {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return <div className="p-8 text-destructive">{ctx.error}</div>;

  const supabase = await getScopedSupabaseClient();
  const repo = new SupabaseAutoSalesRepository(supabase);
  const inventory = await new ListInventoryUseCase(repo).execute(ctx.workspaceId, { status: "available" });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estoque de Veículos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {inventory.length} {inventory.length === 1 ? "veículo disponível" : "veículos disponíveis"}
        </p>
      </div>
      <AutoSalesInventoryClient inventory={inventory} workspaceId={ctx.workspaceId} />
    </div>
  );
}
