"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { getMfaFactors } from "@/app/(dashboard)/settings/mfa-actions";

const DISMISS_KEY = "mfa-banner-dismissed-until";
const DISMISS_DAYS = 30;

export function MfaBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

    getMfaFactors().then(({ factors }) => {
      const enrolled = factors.some((f: { status: string }) => f.status === "verified");
      if (!enrolled) setShow(true);
    }).catch(() => {});
  }, []);

  function dismiss() {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 shrink-0">
      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 font-medium">
        <ShieldAlert size={15} className="shrink-0" />
        <span>
          Proteja sua conta com autenticação em 2 fatores.{" "}
          <Link
            href="/settings"
            className="underline underline-offset-2 hover:no-underline"
          >
            Configurar agora
          </Link>
        </span>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/20 transition-colors"
        aria-label="Dispensar"
      >
        <X size={13} />
      </button>
    </div>
  );
}
