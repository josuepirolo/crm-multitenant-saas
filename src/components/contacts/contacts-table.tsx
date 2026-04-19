"use client";

import { Edit2, Trash2, Phone, Mail, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/repositories/contact.repository";

const STATUS_STYLES: Record<string, string> = {
  lead:     "bg-primary/10 text-primary",
  prospect: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  customer: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  churned:  "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  lead:     "Lead",
  prospect: "Prospect",
  customer: "Cliente",
  churned:  "Inativo",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

interface ContactsTableProps {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onPageChange: (page: number) => void;
}

export function ContactsTable({ contacts, total, page, pageSize, loading, onEdit, onDelete, onPageChange }: ContactsTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  if (loading) {
    return <ContactsTableSkeleton />;
  }

  if (!loading && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Building2 size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Nenhum contato encontrado</p>
        <p className="mt-1 text-xs text-muted-foreground">Tente ajustar os filtros ou crie um novo contato.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contato</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground sm:table-cell">Informações</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground lg:table-cell">Criado em</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {contacts.map((contact) => (
              <tr key={contact.id} className="group transition-colors hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(contact.name)}
                    </div>
                    <span className="font-medium leading-tight">{contact.name}</span>
                  </div>
                </td>

                <td className="hidden px-4 py-3 sm:table-cell">
                  <div className="flex flex-col gap-0.5">
                    {contact.phone && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={11} className="shrink-0" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail size={11} className="shrink-0" />
                        {contact.email}
                      </span>
                    )}
                    {!contact.phone && !contact.email && (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>
                </td>

                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-sm text-muted-foreground">{contact.company ?? "—"}</span>
                </td>

                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_STYLES[contact.status] ?? STATUS_STYLES.lead
                  )}>
                    {STATUS_LABELS[contact.status] ?? contact.status}
                  </span>
                </td>

                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className="text-xs text-muted-foreground">{formatDate(contact.created_at)}</span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(contact)}
                      className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(contact)}
                      className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{from}–{to} de {total}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span className="px-1 text-xs">{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactsTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contato</th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground sm:table-cell">Informações</th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">Empresa</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground lg:table-cell">Criado em</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${60 + (i % 3) * 20}%`, maxWidth: 160 }} />
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-36 animate-pulse rounded bg-muted" />
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
              </td>
              <td className="px-4 py-3">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
              </td>
              <td className="px-4 py-3" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
