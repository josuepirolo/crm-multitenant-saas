"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appleEase } from "@/components/ui/motion";
import { Megaphone, X } from "lucide-react";

interface CreateCampaignPayload {
  name: string;
  type: string;
  text?: string;
  phones: string[];
}

interface WaCreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCampaignPayload) => Promise<boolean>;
}

const CAMPAIGN_TYPES = ["text", "image", "audio", "video", "document"] as const;

export function WaCreateCampaignDialog({ open, onOpenChange, onSubmit }: WaCreateCampaignDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [text, setText] = useState("");
  const [phonesRaw, setPhonesRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedPhones = phonesRaw
    .split(/[\n,;]/)
    .map((p) => p.trim().replace(/\D/g, ""))
    .filter((p) => p.length >= 10 && p.length <= 15);

  function reset() {
    setName("");
    setType("text");
    setText("");
    setPhonesRaw("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    const ok = await onSubmit({
      name: name.trim(),
      type,
      text: type === "text" ? text : undefined,
      phones: parsedPhones,
    });
    setIsSubmitting(false);
    if (ok) {
      reset();
      onOpenChange(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) onOpenChange(false);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <ModalOverlay onClick={handleClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Nova campanha WhatsApp"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="relative z-50 w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-md"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
              <Megaphone size={16} className="text-muted-foreground" />
              <h2 className="flex-1 text-base font-semibold">Nova campanha</h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-40"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cname">Nome da campanha</Label>
                <Input
                  id="cname"
                  placeholder="Ex: Promoção Junho"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={150}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Tipo */}
              <div className="flex flex-col gap-1.5">
                <Label>Tipo de mensagem</Label>
                <Select
                  value={type}
                  onValueChange={(v) => { if (v !== null) setType(v); }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Texto da mensagem (só para type=text) */}
              {type === "text" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ctext">Mensagem</Label>
                  <textarea
                    id="ctext"
                    placeholder="Olá! Confira nossa promoção…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    maxLength={4096}
                    required
                    disabled={isSubmitting}
                    className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">{text.length}/4096</p>
                </div>
              )}

              {/* Destinatários */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cphones">
                  Destinatários{" "}
                  <span className="text-muted-foreground text-xs">(um por linha; números em E.164)</span>
                </Label>
                <textarea
                  id="cphones"
                  placeholder={"5544999990000\n5511888880000"}
                  value={phonesRaw}
                  onChange={(e) => setPhonesRaw(e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                {parsedPhones.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parsedPhones.length} número(s) válido(s) — opt-outs e sem WA serão excluídos automaticamente
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || (type === "text" && !text.trim())}
                >
                  <Megaphone size={14} className="mr-1.5" />
                  {isSubmitting ? "Criando…" : "Criar campanha"}
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
