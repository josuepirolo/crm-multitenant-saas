"use client";

import { useTransition } from "react";
import { ShieldAlert, X } from "lucide-react";
import { stopImpersonation } from "@/app/(admin)/admin/impersonation-actions";

interface ImpersonationBannerProps {
  workspaceName: string;
}

export function ImpersonationBanner({ workspaceName }: ImpersonationBannerProps) {
  const [isPending, startTransition] = useTransition();

  function handleStop() {
    startTransition(() => stopImpersonation());
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-destructive/90 text-destructive-foreground px-4 py-2.5 text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <ShieldAlert size={15} className="shrink-0" />
        <span>
          Modo superadmin — visualizando como:{" "}
          <span className="font-bold">{workspaceName}</span>
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-destructive-foreground/30 px-3 py-1 text-xs font-medium hover:bg-destructive-foreground/10 transition-colors disabled:opacity-50"
      >
        <X size={12} />
        {isPending ? "Saindo..." : "Voltar para Superadmin"}
      </button>
    </div>
  );
}
