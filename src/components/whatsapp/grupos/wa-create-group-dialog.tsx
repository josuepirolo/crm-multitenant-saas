"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appleEase } from "@/components/ui/motion";
import { X, Plus } from "lucide-react";

interface WaCreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (groupName: string, phones: string[]) => Promise<boolean>;
}

export function WaCreateGroupDialog({ open, onOpenChange, onSubmit }: WaCreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [phonesRaw, setPhonesRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedPhones = phonesRaw
    .split(/[\n,;]/)
    .map((p) => p.trim().replace(/\D/g, ""))
    .filter((p) => p.length >= 10 && p.length <= 15);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!groupName.trim() || parsedPhones.length === 0) return;
    setIsSubmitting(true);
    const ok = await onSubmit(groupName.trim(), parsedPhones);
    setIsSubmitting(false);
    if (ok) {
      setGroupName("");
      setPhonesRaw("");
      onOpenChange(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <ModalOverlay onClick={() => onOpenChange(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Criar grupo WhatsApp"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="relative z-50 w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <h2 className="text-base font-semibold">Criar grupo WhatsApp</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gname">Nome do grupo</Label>
                <Input
                  id="gname"
                  placeholder="Ex: Clientes VIP"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gphones">
                  Participantes{" "}
                  <span className="text-muted-foreground text-xs">(um por linha, vírgula ou ponto-e-vírgula)</span>
                </Label>
                <textarea
                  id="gphones"
                  placeholder={"5544999990000\n5511888880000"}
                  value={phonesRaw}
                  onChange={(e) => setPhonesRaw(e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                {parsedPhones.length > 0 && (
                  <p className="text-xs text-muted-foreground">{parsedPhones.length} número(s) válido(s)</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !groupName.trim() || parsedPhones.length === 0}>
                  <Plus size={14} className="mr-1.5" />
                  {isSubmitting ? "Criando…" : "Criar grupo"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
