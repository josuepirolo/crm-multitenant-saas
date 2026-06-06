"use client";

import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { motion } from "framer-motion";
import { signUp } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, AlertCircle, Building2, Briefcase } from "lucide-react";
import { appleEase } from "@/components/ui/motion";
import { Turnstile } from "@marsidev/react-turnstile";
import type { BusinessNiche } from "@/types";

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

function SubmitButton({ captchaReady }: { captchaReady: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || !captchaReady;
  return (
    <Button
      type="submit"
      className="w-full h-11 text-sm font-medium rounded-xl transition-all duration-200"
      disabled={disabled}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Criando conta...
        </span>
      ) : !captchaReady ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary/60 animate-spin" />
          Verificando...
        </span>
      ) : (
        "Criar conta grátis"
      )}
    </Button>
  );
}

interface Props {
  niches: BusinessNiche[];
}

export function RegisterForm({ niches }: Props) {
  const [state, action] = useActionState(signUp, null);
  const [selectedNiche, setSelectedNiche] = useState<string>(state?.nicheId ?? "");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [captchaReady, setCaptchaReady] = useState(false);

  useEffect(() => {
    if (state?.error) {
      setCaptchaReady(false);
      setTurnstileKey((k) => k + 1);
    }
  }, [state?.error]);

  const parents = niches.filter((n) => !n.parent_id);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted px-4 py-12">
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
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8">

          <motion.div variants={item} className="flex flex-col items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <MessageSquare size={26} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
              <p className="mt-1 text-sm text-muted-foreground">Comece a usar o CRM Vendas grátis</p>
            </div>
          </motion.div>

          <form action={action} className="space-y-4">

            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sua empresa
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName" className="text-sm font-medium">Nome da empresa</Label>
                  <Input
                    id="workspaceName"
                    name="workspaceName"
                    type="text"
                    placeholder="Acme Vendas"
                    autoFocus
                    autoComplete="organization"
                    required
                    defaultValue={state?.workspaceName ?? ""}
                    className="h-11 rounded-xl border-border/60 bg-background text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="niche-select" className="text-sm font-medium flex items-center gap-1.5">
                    <Briefcase size={13} className="text-muted-foreground" />
                    Segmento de negócio
                  </Label>
                  <Select
                    value={selectedNiche}
                    onValueChange={(v) => setSelectedNiche(v ?? "")}
                    required
                  >
                    <SelectTrigger
                      id="niche-select"
                      className="h-11 rounded-xl border-border/60 bg-background text-foreground text-sm focus:ring-primary/30 transition-all duration-200"
                    >
                      <SelectValue>
                        {selectedNiche
                          ? niches.find((n) => n.id === selectedNiche)?.name
                          : <span className="text-muted-foreground">Selecione o segmento...</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((parent) => {
                        const children = niches.filter((n) => n.parent_id === parent.id);
                        if (children.length > 0) {
                          return (
                            <SelectGroup key={parent.id}>
                              <SelectLabel className="text-xs font-semibold text-muted-foreground">
                                {parent.name}
                              </SelectLabel>
                              {children.map((child) => (
                                <SelectItem key={child.id} value={child.id}>
                                  {child.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        }
                        return (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="nicheId" value={selectedNiche} />
                </div>
              </div>
            </motion.div>

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
                defaultValue={state?.name ?? ""}
                className="h-11 rounded-xl border-border/60 bg-background text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30 transition-all duration-200"
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
                defaultValue={state?.email ?? ""}
                className="h-11 rounded-xl border-border/60 bg-background text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30 transition-all duration-200"
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Mínimo 6 caracteres"
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

            <motion.div variants={item} className="flex justify-center">
              <Turnstile
                key={turnstileKey}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={() => setCaptchaReady(true)}
                onExpire={() => setCaptchaReady(false)}
                onError={() => setCaptchaReady(false)}
              />
            </motion.div>

            <motion.div variants={item}>
              <SubmitButton captchaReady={captchaReady} />
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
