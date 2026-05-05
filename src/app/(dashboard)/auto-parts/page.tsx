import { getWorkspaceContext } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import { SupabaseAutoPartsRepository } from "@/repositories/auto-parts.repository";
import { ListAutoPartsCatalogUseCase } from "@/usecases/AutoPartsUseCases";
import { SupabaseVehicleCatalogRepository } from "@/repositories/vehicle-catalog.repository";
import { ListVehicleModelsUseCase } from "@/usecases/VehicleCatalogUseCases";
import { AutoPartsCatalogClient } from "@/components/auto-parts/auto-parts-catalog-client";

export default async function AutoPartsPage() {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return <div className="p-8 text-destructive">{ctx.error}</div>;

  const supabase = await createClient();
  const repo = new SupabaseAutoPartsRepository(supabase);
  const catalogRepo = new SupabaseVehicleCatalogRepository(supabase);

  const [parts, models] = await Promise.all([
    new ListAutoPartsCatalogUseCase(repo).execute(),
    new ListVehicleModelsUseCase(catalogRepo).execute(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Peças</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {parts.length} {parts.length === 1 ? "peça" : "peças"} no catálogo
        </p>
      </div>
      <AutoPartsCatalogClient
        parts={parts}
        models={models}
        workspaceId={ctx.workspaceId}
      />
    </div>
  );
}
