"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { inviteMember } from "@/app/(dashboard)/settings/actions";
import { inviteMemberSchema, type InviteMemberFormValues } from "@/lib/validations/workspace";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ASSIGNABLE_ROLES } from "@/lib/permissions";
import { appleEase } from "@/components/ui/motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ open, onClose, onInvited }: InviteMemberModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InviteMemberFormValues>({
      resolver: zodResolver(inviteMemberSchema),
      defaultValues: { role: "sales" },
    });

  async function onSubmit(values: InviteMemberFormValues) {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("role", values.role);

    const resultPromise = inviteMember(null, formData).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(resultPromise, {
      loading: "Convidando membro...",
      success: "Membro adicionado ao workspace!",
      error:   (err: Error) => err.message,
    });

    try {
      await resultPromise;
      reset();
      onInvited();
    } catch { /* handled by toast */ }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <ModalOverlay onClick={onClose} />
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/20"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-base font-semibold">Convidar membro</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="membro@empresa.com"
                  autoFocus
                  className="h-10 rounded-xl border-border/60"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                <p className="text-xs text-muted-foreground">O usuário precisa ter uma conta criada no sistema.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Função</Label>
                <select
                  {...register("role")}
                  className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl min-w-[100px]">
                  {isSubmitting ? "Convidando..." : "Convidar"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
