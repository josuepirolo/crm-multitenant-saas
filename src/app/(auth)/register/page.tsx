"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { motion } from "framer-motion";
import { signUp } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertCircle, Building2 } from "lucide-react";
import { appleEase } from "@/components/ui/motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
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
          Criando conta...
        </span>
      ) : (
        "Criar conta grátis"
      )}
    </Button>
  );
}

export default function RegisterPage() {
  const [state, action] = useActionState(signUp, null);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F5F7] px-4 py-12">
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
        <div className="rounded-2xl border border-border/50 bg-white/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8">

          {/* Logo */}
          <motion.div variants={item} className="flex flex-col items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <MessageSquare size={26} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece a usar o CRM Vendas grátis
              </p>
            </div>
          </motion.div>

          <form action={action} className="space-y-4">

            {/* Separador empresa */}
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sua empresa
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspaceName" className="text-sm font-medium">
                  Nome da empresa
                </Label>
                <Input
                  id="workspaceName"
                  name="workspaceName"
                  type="text"
                  placeholder="Acme Vendas"
                  autoFocus
                  autoComplete="organization"
                  required
                  className="h-11 rounded-xl border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 transition-all duration-200"
                />
              </div>
            </motion.div>

            {/* Separador conta */}
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3 pt-1">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                  Sua conta
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Nome</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Seu nome completo"
                autoComplete="name"
                required
                className="h-11 rounded-xl border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 transition-all duration-200"
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@empresa.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 transition-all duration-200"
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                className="h-11 rounded-xl border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 transition-all duration-200"
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar senha
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="h-11 rounded-xl border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 transition-all duration-200"
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

          <motion.div variants={item} className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors duration-150">
                Entrar
              </Link>
            </p>
          </motion.div>
        </div>

        <motion.p variants={item} className="mt-6 text-center text-xs text-muted-foreground/60">
          Ao criar uma conta, você concorda com os{" "}
          <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground transition-colors">
            Termos de Uso
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}
