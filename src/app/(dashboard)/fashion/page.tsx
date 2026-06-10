import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { SupabaseFashionRepository } from "@/repositories/fashion.repository";
import { ListFashionProductsUseCase } from "@/usecases/FashionUseCases";
import { FashionProductsClient } from "@/components/fashion/fashion-products-client";

export default async function FashionPage() {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return <div className="p-8 text-destructive">{ctx.error}</div>;

  const supabase = await getScopedSupabaseClient();
  const repo = new SupabaseFashionRepository(supabase);
  const products = await new ListFashionProductsUseCase(repo).execute(ctx.workspaceId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {products.length} {products.length === 1 ? "produto" : "produtos"} ativos
        </p>
      </div>
      <FashionProductsClient products={products} workspaceId={ctx.workspaceId} />
    </div>
  );
}
