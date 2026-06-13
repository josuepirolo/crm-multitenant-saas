import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { SupabaseAutoPartsRepository } from "@/repositories/auto-parts.repository";
import { AutoPartsQuotesClient } from "@/components/auto-parts/auto-parts-quotes-client";

export default async function AutoPartsQuotesPage() {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return <div className="p-8 text-destructive">{ctx.error}</div>;

  const supabase = await getScopedSupabaseClient();
  const repo = new SupabaseAutoPartsRepository(supabase);
  const quotes = await repo.listQuotes(ctx.workspaceId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {quotes.length} {quotes.length === 1 ? "orçamento" : "orçamentos"}
        </p>
      </div>
      <AutoPartsQuotesClient quotes={quotes} workspaceId={ctx.workspaceId} />
    </div>
  );
}
