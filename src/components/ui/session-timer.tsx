"use client";

/**
 * Componente de aviso de expiração de sessão.
 * - Contador discreto no canto inferior direito quando < 10 min restantes
 * - Modal bloqueante quando < 5 min restantes (warningMs)
 * - Renovação via Server Action (nunca puramente client-side)
 * - Expiração efetiva = min(inactividade, absoluto)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshSession } from "@/app/(dashboard)/session-actions";
import { signOut } from "@/app/(dashboard)/actions";
import { cn } from "@/lib/utils";

interface SessionTimerProps {
  /** Epoch ms — expiração por inatividade (do servidor, ao carregar o layout) */
  inactivityExpiresAt: number;
  /** Epoch ms — expiração absoluta (imutável) */
  absoluteExpiresAt:   number;
  /** Ms antes de expirar para mostrar o modal. Default: 5 min */
  warningMs?:          number;
  /** Ms antes de expirar para mostrar o contador discreto. Default: 10 min */
  badgeMs?:            number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min      = Math.floor(totalSec / 60);
  const sec      = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function SessionTimer({
  inactivityExpiresAt,
  absoluteExpiresAt,
  warningMs = 5 * 60 * 1000,
  badgeMs   = 10 * 60 * 1000,
}: SessionTimerProps) {
  const router  = useRouter();
  const [inactivityExpiry, setInactivityExpiry] = useState(inactivityExpiresAt);
  const [remaining, setRemaining]               = useState<number | null>(null);
  const [showModal, setShowModal]               = useState(false);
  const [refreshing, setRefreshing]             = useState(false);
  const warningLoggedRef = useRef(false);

  const effectiveExpiry = Math.min(inactivityExpiry, absoluteExpiresAt);

  // Tick a cada segundo
  useEffect(() => {
    function tick() {
      const r = effectiveExpiry - Date.now();
      setRemaining(r);

      if (r <= 0) {
        // Sessão expirada pelo lado do cliente — próxima request vai redirecionar
        router.push("/login?reason=session_expired");
        return;
      }

      if (r <= warningMs && !warningLoggedRef.current) {
        warningLoggedRef.current = true;
        setShowModal(true);
        // Audit é registrado no servidor na próxima request — não enviamos nada sensível aqui
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [effectiveExpiry, warningMs, router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await refreshSession();
      if (!result.ok || !result.newInactivityExpiresAt) {
        toast.error(result.error ?? "Não foi possível renovar a sessão.");
        return;
      }
      setInactivityExpiry(result.newInactivityExpiresAt);
      warningLoggedRef.current = false;
      setShowModal(false);
      toast.success("Sessão renovada com sucesso.");
    } catch {
      toast.error("Erro ao renovar sessão.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  if (remaining === null || remaining > badgeMs) return null;

  const isUrgent   = remaining <= warningMs;
  const pct        = Math.max(0, Math.min(100, (remaining / warningMs) * 100));
  const strokeDash = 2 * Math.PI * 10; // r=10

  return (
    <>
      {/* ── Contador discreto (badge) ── */}
      {!showModal && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition-all duration-300",
            isUrgent
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400"
          )}
        >
          {/* Mini gauge circular */}
          <svg width="22" height="22" className="-rotate-90">
            <circle cx="11" cy="11" r="10" strokeWidth="2" className="stroke-current opacity-20" fill="none" />
            <circle
              cx="11" cy="11" r="10"
              strokeWidth="2"
              className="stroke-current transition-all duration-1000"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDash}
              strokeDashoffset={strokeDash * (1 - pct / 100)}
            />
          </svg>
          <Clock size={13} className="shrink-0" />
          <span>Sessão expira em {formatTime(remaining)}</span>
        </div>
      )}

      {/* ── Modal bloqueante ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-border/50 bg-card shadow-2xl p-6 space-y-5">
            {/* Ícone + título */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Clock size={26} className="text-amber-600" />
                  </div>
                  {/* Badge de tempo urgente */}
                  <span className={cn(
                    "absolute -top-1 -right-1 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1",
                    remaining <= 60_000 ? "bg-destructive" : "bg-amber-500"
                  )}>
                    {formatTime(remaining)}
                  </span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Sessão prestes a expirar</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua sessão expirará em <strong>{formatTime(remaining)}</strong> por inatividade.
                  Deseja continuar?
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  remaining <= 60_000 ? "bg-destructive" : "bg-amber-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {refreshing ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {refreshing ? "Renovando..." : "Continuar sessão"}
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut size={14} />
                Sair agora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
