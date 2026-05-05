import { getWorkspaceContext } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import { SupabaseAutoSalesRepository } from "@/repositories/auto-sales.repository";
import { ListProposalsUseCase } from "@/usecases/AutoSalesUseCases";
import { AutoSalesProposalsClient } from "@/components/auto-sales/auto-sales-proposals-client";

export default async function AutoSalesProposalsPage() {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return <div className="p-8 text-destructive">{ctx.error}</div>;

  const supabase = await createClient();
  const repo = new SupabaseAutoSalesRepository(supabase);
  const proposals = await new ListProposalsUseCase(repo).execute(ctx.workspaceId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propostas de Venda</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {proposals.length} {proposals.length === 1 ? "proposta" : "propostas"}
        </p>
      </div>
      <AutoSalesProposalsClient proposals={proposals} workspaceId={ctx.workspaceId} />
    </div>
  );
}
