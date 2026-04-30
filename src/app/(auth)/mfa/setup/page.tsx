"use client";

import { useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Copy, Check, QrCode } from "lucide-react";
import { toast } from "sonner";
import { startMfaEnrollment, activateMfa } from "@/app/(dashboard)/settings/mfa-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function MfaSetupPage() {
  const router = useRouter();
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, startEnroll] = useTransition();
  const [activateState, activateAction, activatePending] = useActionState(activateMfa, null);

  // Ativação com sucesso → vai para dashboard (cookie expira em 24h, ou middleware bypass via MFA enrolled)
  if (activateState && "success" in activateState && activateState.success) {
    toast.success("Verificação em 2 etapas ativada! Redirecionando...");
    router.push("/dashboard");
  }

  function handleEnroll() {
    startEnroll(async () => {
      const result = await startMfaEnrollment();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setEnrollData(result);
      }
    });
  }

  function copySecret() {
    if (!enrollData?.secret) return;
    navigator.clipboard.writeText(enrollData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck size={28} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Configure a verificação em 2 etapas</h1>
          <p className="text-sm text-muted-foreground">
            Administradores precisam ativar o 2FA para continuar. Isso protege sua conta e todos os dados do workspace.
          </p>
        </div>

        {/* Passo 1: Iniciar */}
        {!enrollData && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Você precisará de um app autenticador:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy ou qualquer app TOTP</li>
              </ul>
            </div>
            <Button className="w-full rounded-xl gap-1.5" onClick={handleEnroll} disabled={starting}>
              <QrCode size={15} />
              {starting ? "Gerando QR Code..." : "Começar configuração"}
            </Button>
          </div>
        )}

        {/* Passo 2: QR Code + verificação */}
        {enrollData && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">1. Escaneie o QR Code com seu app</p>
              <div className="flex justify-center rounded-xl border border-border/60 bg-white p-4 w-fit mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollData.qrCode} alt="QR Code 2FA" width={180} height={180} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Ou insira o código manualmente</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-xs font-mono tracking-wider break-all">
                  {enrollData.secret}
                </code>
                <Button type="button" variant="outline" size="sm" className="rounded-lg shrink-0" onClick={copySecret}>
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            <form action={activateAction} className="space-y-3">
              <input type="hidden" name="factorId" value={enrollData.factorId} />
              <div className="space-y-1.5">
                <Label>2. Digite o código de 6 dígitos</Label>
                <Input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="h-12 rounded-xl border-border/60 text-center text-lg tracking-[0.5em] font-mono"
                  autoFocus
                />
                {activateState && "error" in activateState && activateState.error && (
                  <p className="text-xs text-destructive">{activateState.error}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl" disabled={activatePending}>
                {activatePending ? "Verificando..." : "Ativar e continuar"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
