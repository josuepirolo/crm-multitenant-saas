"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { appleEase } from "@/components/ui/motion";
import type { WaInstanceWithTenant } from "@/types";
import type { QrCodeResult } from "@/viewmodels/useSettingsIntegrationsViewModel";

interface QrCodeDialogProps {
  instance: WaInstanceWithTenant;
  fetchQrCode: (inst: WaInstanceWithTenant) => Promise<QrCodeResult>;
  fetchStatus: (inst: WaInstanceWithTenant) => Promise<{ connected: boolean } | null>;
  onClose: () => void;
  onConnected: () => void;
}

type Phase = "loading" | "qr" | "connected" | "error";

export function QrCodeDialog({
  instance,
  fetchQrCode,
  fetchStatus,
  onClose,
  onConnected,
}: QrCodeDialogProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const alive = useRef(true);

  const loadQr = async () => {
    setPhase("loading");
    setErrorMsg(null);
    const res = await fetchQrCode(instance);
    if (!alive.current) return;
    if (res.alreadyConnected) {
      setPhase("connected");
      return;
    }
    if (res.error || !res.qrcode) {
      setErrorMsg(res.error ?? "Não foi possível gerar o QR Code.");
      setPhase("error");
      return;
    }
    setQr(res.qrcode);
    setPhase("qr");
  };

  useEffect(() => {
    alive.current = true;
    loadQr();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.instance_id]);

  // Enquanto o QR está visível, faz polling do status; conectou → fecha.
  useEffect(() => {
    if (phase !== "qr") return;
    const id = setInterval(async () => {
      const s = await fetchStatus(instance);
      if (alive.current && s?.connected) setPhase("connected");
    }, 4_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, instance.instance_id]);

  // Ao conectar, avisa o pai e fecha após um instante.
  useEffect(() => {
    if (phase !== "connected") return;
    onConnected();
    const id = setTimeout(onClose, 1800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const title = instance.integration_label || instance.name || "Instância WhatsApp";

  const dialog = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <ModalOverlay onClick={onClose} />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Parear ${title}`}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.3, ease: appleEase }}
          className="relative z-50 w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-md"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>

          <div className="space-y-1 pr-8">
            <h3 className="text-lg font-semibold tracking-tight">Conectar WhatsApp</h3>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>

          <div className="mt-5 flex flex-col items-center">
            {phase === "loading" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Skeleton className="h-56 w-56 rounded-xl" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}

            {phase === "qr" && qr && (
              <div className="flex flex-col items-center gap-4">
                {/* QR precisa ser preto-sobre-branco para o scanner do celular —
                    fundo branco é requisito funcional, não tema. */}
                <div className="rounded-xl border border-border/60 bg-white p-3">
                  {qr.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="QR Code para parear o WhatsApp" className="h-56 w-56" />
                  ) : (
                    <QRCodeSVG value={qr} size={224} level="M" marginSize={0} />
                  )}
                </div>
                <ol className="w-full space-y-1 text-xs text-muted-foreground">
                  <li>1. Abra o WhatsApp no celular</li>
                  <li>2. Toque em Aparelhos conectados → Conectar aparelho</li>
                  <li>3. Aponte a câmera para este código</li>
                </ol>
                <button
                  onClick={loadQr}
                  className="inline-flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80"
                >
                  <RefreshCw size={12} />
                  Gerar novo código
                </button>
              </div>
            )}

            {phase === "connected" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="text-emerald-500" size={48} />
                <p className="text-sm font-medium">WhatsApp conectado!</p>
              </div>
            )}

            {phase === "error" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="text-destructive" size={40} />
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
                <button
                  onClick={loadQr}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <RefreshCw size={12} />
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
