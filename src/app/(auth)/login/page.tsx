"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { motion } from "framer-motion";
import { signIn } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertCircle } from "lucide-react";
import { appleEase } from "@/components/ui/motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: appleEase } },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full h-11 text-sm font-medium rounded-xl transition-all duration-200"
      disabled={pending}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Entrando...
        </span>
      ) : (
        "Entrar"
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [state, action] = useActionState(signIn, null);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F5F7] px-4 [color-scheme:light]">
      {/* Fundo com gradiente sutil */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[400px]"
      >
        {/* Card */}
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl shadow-xl shadow-black/[0.06] dark:shadow-black/30 p-8">

          {/* Logo */}
          <motion.div variants={item} className="flex flex-col items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <MessageSquare size={26} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                CRM Vendas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre na sua conta para continuar
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <form action={action} className="space-y-5">
            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@empresa.com"
                autoFocus
                autoComplete="email"
                required
                className="h-11 rounded-xl border-border/60 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-primary/30 transition-all duration-200"
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Link
                  href="/reset-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors duration-150"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-11 rounded-xl border-border/60 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-primary/30 transition-all duration-200"
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

          {/* Divider */}
          <motion.div variants={item} className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:text-primary/80 transition-colors duration-150"
              >
                Criar conta
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Rodapé */}
        <motion.p
          variants={item}
          className="mt-6 text-center text-xs text-muted-foreground/60"
        >
          Ao continuar, você concorda com os{" "}
          <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground transition-colors">
            Termos de Uso
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}
