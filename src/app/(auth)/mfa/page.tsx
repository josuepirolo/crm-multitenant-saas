"use client";

import { useActionState } from "react";
import { verifyMfaLogin } from "./actions";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function MfaPage() {
  const [state, action, pending] = useActionState(verifyMfaLogin, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck size={24} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verificação em 2 etapas</h1>
          <p className="text-sm text-muted-foreground">
            Abra seu app autenticador e insira o código de 6 dígitos.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Código de verificação</Label>
            <Input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              className="h-12 rounded-xl border-border/60 text-center text-lg tracking-[0.5em] font-mono"
            />
            {state?.error && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
          </div>

          <Button type="submit" disabled={pending} className="w-full h-11 rounded-xl">
            {pending ? "Verificando..." : "Verificar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Use Google Authenticator, Microsoft Authenticator, Authy ou qualquer app compatível com TOTP.
        </p>
      </div>
    </div>
  );
}
