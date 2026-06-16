import { getWorkspaceContext } from "@/lib/guards";
import { listWorkspaceWaInstances } from "@/app/(dashboard)/settings/integrations-actions";
import { WaCampanhasClient } from "@/components/whatsapp/campanhas/wa-campanhas-client";

export default async function WhatsAppCampanhasPage() {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Você não tem permissão para acessar campanhas WhatsApp.
      </div>
    );
  }

  const { instances } = await listWorkspaceWaInstances();

  return <WaCampanhasClient instances={instances} />;
}
