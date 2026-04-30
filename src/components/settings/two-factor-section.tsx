"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startMfaEnrollment, activateMfa, disableMfa, getMfaFactors } from "@/app/(dashboard)/settings/mfa-actions";
import { AppStoreBadges } from "@/components/ui/app-store-badges";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

export function TwoFactorSection() {
  const [factors, setFactors] = useState<Factor[]>([]);

  useEffect(() => {
    getMfaFactors().then(({ factors: f }) => setFactors(f as Factor[]));
  }, []);

  const activeFactor = factors.find((f) => f.status === "verified");
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [disabling, startDisable] = useTransition();
  const [starting, startEnroll] = useTransition();

  const [activateState, activateAction, activatePending] = useActionState(activateMfa, null);

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

  function handleDisable(factorId: string) {
    startDisable(async () => {
      const result = await disableMfa(factorId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Verificação em 2 etapas desativada.");
        window.location.reload();
      }
    });
  }

  function copySecret() {
    if (!enrollData?.secret) return;
    navigator.clipboard.writeText(enrollData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Ativação com sucesso → limpa setup e recarrega
  if (activateState && "success" in activateState && activateState.success) {
    toast.success("Verificação em 2 etapas ativada!");
    setEnrollData(null);
    window.location.reload();
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Verificação em 2 etapas</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Proteja sua conta com um código gerado pelo seu app autenticador.
          </p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          activeFactor ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
        }`}>
          {activeFactor ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
          {activeFactor ? "Ativo" : "Inativo"}
        </div>
      </div>

      {/* 2FA ativo — opção para desativar */}
      {activeFactor && !enrollData && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Seu app autenticador está configurado. A cada login, você precisará inserir o código de 6 dígitos.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
            onClick={() => handleDisable(activeFactor.id)}
            disabled={disabling}
          >
            <ShieldOff size={14} />
            {disabling ? "Removendo..." : "Desativar 2FA"}
          </Button>
        </div>
      )}

      {/* 2FA inativo — botão para ativar */}
      {!activeFactor && !enrollData && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Adicione uma camada extra de segurança usando qualquer app TOTP.
          </p>
          <details className="group">
            <summary className="text-xs text-primary cursor-pointer select-none hover:underline">
              Não tem um app instalado? Ver como baixar
            </summary>
            <div className="mt-3">
              <AppStoreBadges />
            </div>
          </details>
          <Button size="sm" className="rounded-xl gap-1.5" onClick={handleEnroll} disabled={starting}>
            <QrCode size={14} />
            {starting ? "Gerando QR Code..." : "Configurar 2FA"}
          </Button>
        </div>
      )}

      {/* Setup: QR Code + verificação */}
      {enrollData && (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">1. Escaneie o QR Code</p>
            <p className="text-xs text-muted-foreground">
              Use Google Authenticator, Microsoft Authenticator, Authy ou qualquer app compatível com TOTP.
            </p>
            <div className="flex justify-center rounded-xl border border-border/60 bg-white p-4 w-fit">
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
                className="h-10 rounded-xl border-border/60 text-center tracking-[0.4em] font-mono"
                autoFocus
              />
              {activateState && "error" in activateState && activateState.error && (
                <p className="text-xs text-destructive">{activateState.error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="rounded-xl" disabled={activatePending}>
                {activatePending ? "Verificando..." : "Ativar 2FA"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setEnrollData(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
