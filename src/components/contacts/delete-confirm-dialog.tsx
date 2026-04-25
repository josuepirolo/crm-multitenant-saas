"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { deleteContact } from "@/app/(dashboard)/contacts/actions";
import { Button } from "@/components/ui/button";
import { appleEase } from "@/components/ui/motion";
import type { Contact } from "@/repositories/contact.repository";

interface DeleteConfirmDialogProps {
  contact: Contact | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmDialog({ contact, onClose, onDeleted }: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!contact) return;
    setLoading(true);
    try {
      const result = await deleteContact(contact.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Contato removido.");
        onDeleted();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {contact && (
        <>
          <ModalOverlay onClick={onClose} />

          <motion.div
            key="dialog"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/20"
          >
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                <h2 className="text-base font-semibold">Remover contato</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja remover <span className="font-medium text-foreground">{contact.name}</span>?
                O contato será desativado e não aparecerá mais na lista.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-xl min-w-[100px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Removendo...
                    </span>
                  ) : "Remover"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
