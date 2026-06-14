"use client";

import { cn } from "@/lib/utils";

type Tone = "connected" | "connecting" | "disconnected";

const STYLES: Record<Tone, string> = {
  connected:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  connecting: "bg-warning/10 text-warning ring-warning/20",
  disconnected: "bg-muted text-muted-foreground ring-border",
};

const LABELS: Record<Tone, string> = {
  connected: "Conectado",
  connecting: "Conectando",
  disconnected: "Desconectado",
};

/** Deriva o tom a partir do status canônico (connected boolean) ou do espelho. */
export function toneFromStatus(opts: {
  connected?: boolean;
  status?: string;
}): Tone {
  if (opts.connected === true) return "connected";
  if (opts.status === "connected") return "connected";
  if (opts.status === "connecting") return "connecting";
  return "disconnected";
}

export function WaStatusBadge({ tone, pending }: { tone: Tone; pending?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
        STYLES[tone]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          tone === "connected" && "animate-pulse",
          pending && "animate-pulse"
        )}
      />
      {pending ? "Verificando" : LABELS[tone]}
    </span>
  );
}

export type { Tone };
