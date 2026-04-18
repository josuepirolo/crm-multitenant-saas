import Link from "next/link";
import { Users } from "lucide-react";
import type { RecentContact } from "@/repositories/dashboard.repository";

interface RecentContactsTableProps {
  contacts: RecentContact[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  lead:     { label: "Lead",     className: "bg-primary/10 text-primary" },
  prospect: { label: "Prospect", className: "bg-amber-500/10 text-amber-500" },
  customer: { label: "Cliente",  className: "bg-emerald-500/10 text-emerald-500" },
  churned:  { label: "Inativo",  className: "bg-muted text-muted-foreground" },
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
      {initials}
    </div>
  );
}

export function RecentContactsTable({ contacts }: RecentContactsTableProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Leads recentes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos contatos adicionados</p>
        </div>
        <Link href="/leads" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          Ver todos →
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Users size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum lead ainda</p>
            <p className="text-xs text-muted-foreground mt-0.5">Adicione seu primeiro lead para começar</p>
          </div>
          <Link
            href="/leads"
            className="mt-1 inline-flex h-8 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Adicionar lead
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {contacts.map((contact) => {
            const statusCfg = STATUS_CONFIG[contact.status] ?? STATUS_CONFIG.lead;
            const date = new Date(contact.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            return (
              <div key={contact.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50 transition-colors">
                <Initials name={contact.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{contact.email ?? contact.phone ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
