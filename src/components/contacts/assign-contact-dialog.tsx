"use client";

import { useState } from "react";
import { UserCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appleEase } from "@/components/ui/motion";
import type { Contact, WorkspaceMemberWithProfile } from "@/types";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface AssignContactDialogProps {
  open: boolean;
  contact: Contact | null;
  members: WorkspaceMemberWithProfile[];
  onClose: () => void;
  onAssign: (contactId: string, userId: string | null) => Promise<void>;
}

export function AssignContactDialog({ open, contact, members, onClose, onAssign }: AssignContactDialogProps) {
  const [selected, setSelected] = useState<string | null>(contact?.assigned_to ?? null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!contact) return;
    setSaving(true);
    await onAssign(contact.id, selected);
    setSaving(false);
  }

  const currentAssigned = contact?.assigned_to ?? null;

  return (
    <AnimatePresence>
      {open && contact && (
        <>
          <ModalOverlay onClick={onClose} />
          <motion.div
            key="assign-dialog"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/20"
          >
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserCheck size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Atribuir responsável</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{contact.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-4 pb-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => setSelected(null)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors text-left",
                  selected === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/60 text-muted-foreground"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border">
                  <X size={12} />
                </div>
                <span>Sem responsável</span>
                {currentAssigned === null && (
                  <span className="ml-auto text-xs text-muted-foreground/60">atual</span>
                )}
              </button>

              {members.map((m) => {
                const name = m.profiles?.name ?? m.profiles?.email ?? "Membro";
                const isSelected = selected === m.user_id;
                const isCurrent = currentAssigned === m.user_id;
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setSelected(m.user_id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors text-left",
                      isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60"
                    )}
                  >
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(m.profiles?.name ?? null)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate">{name}</p>
                      {m.profiles?.email && (
                        <p className="truncate text-xs text-muted-foreground">{m.profiles.email}</p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-muted-foreground/60">atual</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/40">
              <Button variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || selected === currentAssigned}
                className="rounded-xl min-w-[80px]"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Salvando...
                  </span>
                ) : "Salvar"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
