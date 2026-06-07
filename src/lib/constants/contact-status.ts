import type { ContactStatus } from "@/types";

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  lead:     "Lead",
  prospect: "Prospect",
  customer: "Cliente",
  churned:  "Inativo",
};

export const CONTACT_STATUS_STYLES: Record<ContactStatus, string> = {
  lead:     "bg-primary/10 text-primary",
  prospect: "bg-warning/10 text-warning",
  customer: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  churned:  "bg-muted text-muted-foreground",
};
