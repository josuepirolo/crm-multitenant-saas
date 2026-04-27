"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { updatePassword } from "../actions";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertCircle } from "lucide-react";
import { appleEase } from "@/components/ui/motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: appleEase } },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-11 text-sm font-medium rounded-xl transition-all duration-200" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Salvando...
        </span>
      ) : "Salvar nova senha"}
    </Button>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, null);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative w-full max-w-[400px]">
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8">

        <motion.div variants={item} className="flex flex-col items-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <MessageSquare size={26} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha uma senha segura</p>
          </div>
        </motion.div>

        <form action={action} className="space-y-5">
          <motion.div variants={item} className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Nova senha</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
          </motion.div>

          <motion.div variants={item} className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar senha</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </motion.div>

          {state?.error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: appleEase }}
              className="flex items-center gap-2.5 rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3"
            >
              <AlertCircle size={15} className="shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{state.error}</p>
            </motion.div>
          )}

          <motion.div variants={item}>
            <SubmitButton />
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
}
