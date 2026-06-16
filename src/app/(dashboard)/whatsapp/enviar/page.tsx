import { getWorkspaceContext } from "@/lib/guards";
import { listWorkspaceWaInstances } from "@/app/(dashboard)/settings/integrations-actions";
import { WaEnviarForm } from "@/components/whatsapp/enviar/wa-enviar-form";

export default async function WhatsAppEnviarPage() {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Você não tem permissão para enviar mensagens WhatsApp.
      </div>
    );
  }

  const { instances } = await listWorkspaceWaInstances();

  return <WaEnviarForm instances={instances} />;
}
