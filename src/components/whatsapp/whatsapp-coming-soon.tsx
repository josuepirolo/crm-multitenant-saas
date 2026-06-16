import { Construction } from "lucide-react";

interface WhatsAppComingSoonProps {
  title: string;
  description: string;
}

export function WhatsAppComingSoon({ title, description }: WhatsAppComingSoonProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Construction size={26} />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Aguardando contratos operacionais do backend WA — ver recado em{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
          backend_zapi/REQUEST-operational-contracts-groups-messages-campaigns.md
        </code>
      </p>
    </div>
  );
}
