"use client";

import { useState } from "react";
import { Smartphone, QrCode, RotateCw, Power, UserCircle } from "lucide-react";
import { WaStatusBadge, toneFromStatus } from "./wa-status-badge";
import type { WaInstanceLiveStatus, WaInstanceWithTenant } from "@/types";

interface WaInstanceCardProps {
  instance: WaInstanceWithTenant;
  liveStatus?: WaInstanceLiveStatus;
  canManage: boolean;
  onConnect: (inst: WaInstanceWithTenant) => void;
  onRestart: (inst: WaInstanceWithTenant) => void;
  onDisconnect: (inst: WaInstanceWithTenant) => void;
  onOpenAccount: (inst: WaInstanceWithTenant) => void;
}

export function WaInstanceCard({
  instance,
  liveStatus,
  canManage,
  onConnect,
  onRestart,
  onDisconnect,
  onOpenAccount,
}: WaInstanceCardProps) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const pending = liveStatus === undefined;
  const tone = toneFromStatus({
    connected: liveStatus?.connected,
    status: liveStatus?.status ?? instance.status,
  });
  const isConnected = tone === "connected";

  const title = instance.integration_label || instance.name || "Instância WhatsApp";

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {instance.phone || (isConnected ? "Número conectado" : "Sem número conectado")}
            </p>
          </div>
        </div>
        <WaStatusBadge tone={tone} pending={pending} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isConnected && (
          <button
            onClick={() => onConnect(instance)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <QrCode size={13} />
            Conectar
          </button>
        )}

        {isConnected && (
          <button
            onClick={() => onOpenAccount(instance)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <UserCircle size={13} />
            Perfil
          </button>
        )}

        {canManage && isConnected && (
          <button
            onClick={() => onRestart(instance)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCw size={13} />
            Reiniciar
          </button>
        )}

        {canManage && isConnected && (
          confirmDisconnect ? (
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Desconectar?</span>
              <button
                onClick={() => {
                  setConfirmDisconnect(false);
                  onDisconnect(instance);
                }}
                className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Power size={13} />
              Desconectar
            </button>
          )
        )}
      </div>
    </div>
  );
}
