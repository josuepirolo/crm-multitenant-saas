"use client";

import { useState, useActionState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, Copy, Check, QrCode, Users, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { startMfaEnrollment, activateMfa } from "@/app/(dashboard)/settings/mfa-actions";
import { AppStoreBadges, detectDevice, type DeviceType } from "@/components/ui/app-store-badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function MfaSetupPage() {
  const router = useRouter();
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, startEnroll] = useTransition();
  const [activateState, activateAction, activatePending] = useActionState(activateMfa, null);
  const [device, setDevice] = useState<DeviceType>(null);

  useEffect(() => { setDevice(detectDevice()); }, []);

  const step = enrollData ? 2 : 1;

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
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-4 py-10 gap-6">
      <div className="w-full max-w-md space-y-5">

        {/* Banner de obrigatoriedade */}
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4">
          <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-warning">
              Verificação em 2 etapas obrigatória
            </p>
            <p className="text-xs text-warning/80">
              Como administrador, você tem acesso a dados de toda a equipe e do workspace. O 2FA é exigido para proteger todos os membros.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck size={32} className="text-primary" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {step}/2
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configure seu autenticador</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1
                ? "Instale um app e escaneie o QR Code para proteger sua conta."
                : "Escaneie o QR Code e confirme com o código de 6 dígitos."}
            </p>
          </div>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                s < step  ? "bg-primary text-primary-foreground" :
                s === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                             "bg-muted text-muted-foreground"
              )}>
                {s < step ? <Check size={13} /> : s}
              </div>
              <span className={cn("text-xs font-medium", s === step ? "text-foreground" : "text-muted-foreground")}>
                {s === 1 ? "Instalar app" : "Ativar código"}
              </span>
              {s < 2 && <div className="flex-1 h-px bg-border/60" />}
            </div>
          ))}
        </div>

        {/* Passo 1: Escolher app */}
        {!enrollData && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Instale um app autenticador</p>
              <p className="text-xs text-muted-foreground">
                Qualquer app TOTP funciona. Os mais usados:
              </p>

              <AppStoreBadges />
            </div>

            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por que isso protege você</p>
              {[
                { icon: Lock,       text: "Mesmo que sua senha seja roubada, ninguém entra sem o código" },
                { icon: Users,      text: "Protege todos os membros e dados do seu workspace" },
                { icon: Smartphone, text: "Código muda a cada 30s — impossível adivinhar" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2">
                  <Icon size={13} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>

            <Button className="w-full h-11 rounded-xl gap-1.5" onClick={handleEnroll} disabled={starting}>
              <QrCode size={15} />
              {starting ? "Gerando QR Code..." : "Continuar — gerar QR Code"}
            </Button>
          </div>
        )}

        {/* Passo 2: QR Code + verificação */}
        {enrollData && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. Escaneie com o app</p>
              <p className="text-xs text-muted-foreground">Abra o app autenticador e aponte a câmera para o QR Code.</p>
              <div className="flex justify-center rounded-xl border border-border/60 bg-white p-4 w-fit mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollData.qrCode} alt="QR Code 2FA" width={180} height={180} />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Não consegue escanear? Insira este código manualmente no app:</p>
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
                <Label className="font-semibold">2. Digite o código de 6 dígitos</Label>
                <p className="text-xs text-muted-foreground">O app mostra um código que muda a cada 30 segundos.</p>
                <Input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000 000"
                  className="h-12 rounded-xl border-border/60 text-center text-xl tracking-[0.6em] font-mono"
                  autoFocus
                />
                {activateState && "error" in activateState && activateState.error && (
                  <p className="text-sm text-destructive font-medium">{activateState.error}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl gap-1.5" disabled={activatePending}>
                {activatePending ? (
                  <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verificando...</>
                ) : (
                  <><ShieldCheck size={15} /> Ativar e acessar o painel</>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
