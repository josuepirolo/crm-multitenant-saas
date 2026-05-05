import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/guards";
import { getWorkspaceUsageSummaries } from "../analytics-actions";
import { AdminAnalyticsClient } from "@/components/admin/admin-analytics-client";

export default async function AdminAnalyticsPage() {
  const sa = await requireSuperAdmin();
  if (!sa) redirect("/dashboard");

  const { data, error } = await getWorkspaceUsageSummaries({ days: 30 });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Uso</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sessões, acessos e áreas por workspace — últimos 30 dias
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <AdminAnalyticsClient summaries={data} />
      )}
    </div>
  );
}
