"use client";

/**
 * Componente reutilizável que exibe links/QR codes para baixar apps autenticadores.
 * - Desktop: QR codes iOS + Android gerados localmente (qrcode.react, sem chamada externa)
 * - Mobile iOS: badge "Baixar na App Store"
 * - Mobile Android: badge "Baixar no Google Play"
 *
 * Usage:
 *   <AppStoreBadges />
 */

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export const AUTHENTICATOR_APPS = [
  {
    key:     "google",
    label:   "Google Authenticator",
    letter:  "G",
    color:   "text-[#4285F4] bg-[#4285F4]/10",
    ios:     "https://apps.apple.com/app/google-authenticator/id388497605",
    android: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
  },
  {
    key:     "microsoft",
    label:   "Microsoft Authenticator",
    letter:  "M",
    color:   "text-[#00A4EF] bg-[#00A4EF]/10",
    ios:     "https://apps.apple.com/app/microsoft-authenticator/id983156458",
    android: "https://play.google.com/store/apps/details?id=com.azure.authenticator",
  },
  {
    key:     "authy",
    label:   "Authy / qualquer TOTP",
    letter:  "A",
    color:   "text-[#EC1B24] bg-[#EC1B24]/10",
    ios:     "https://apps.apple.com/app/authy/id494168017",
    android: "https://play.google.com/store/apps/details?id=com.authy.authy",
  },
] as const;

export type AuthApp = (typeof AUTHENTICATOR_APPS)[number];
export type DeviceType = "ios" | "android" | "desktop" | null;

export function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function AppCard({ app, device }: { app: AuthApp; device: DeviceType }) {
  const url = device === "ios" ? app.ios : app.android;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0", app.color)}>
          {app.letter}
        </div>
        <span className="text-xs font-medium">{app.label}</span>
      </div>

      {device === "desktop" ? (
        <div className="flex gap-3">
          <div className="space-y-1">
            <div className="rounded-lg border border-border/60 bg-white p-1.5 w-fit">
              <QRCodeSVG value={app.ios} size={56} />
            </div>
            <p className="text-[9px] text-muted-foreground text-center">iOS</p>
          </div>
          <div className="space-y-1">
            <div className="rounded-lg border border-border/60 bg-white p-1.5 w-fit">
              <QRCodeSVG value={app.android} size={56} />
            </div>
            <p className="text-[9px] text-muted-foreground text-center">Android</p>
          </div>
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border/60 bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          {device === "ios" ? "🍎 App Store" : "▶ Google Play"}
          <ExternalLink size={11} className="text-muted-foreground" />
        </a>
      )}
    </div>
  );
}

interface AppStoreBadgesProps {
  /** Mostra apenas um app específico (ex: só Google). Default: todos os 3 */
  apps?: AuthApp[];
  className?: string;
}

export function AppStoreBadges({ apps = [...AUTHENTICATOR_APPS], className }: AppStoreBadgesProps) {
  const [device, setDevice] = useState<DeviceType>(null);
  useEffect(() => { setDevice(detectDevice()); }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {device === "desktop" && (
        <p className="text-[10px] text-muted-foreground">
          No computador? Aponte o celular para os QR codes abaixo para baixar.
        </p>
      )}
      {apps.map((app) => (
        <AppCard key={app.key} app={app} device={device} />
      ))}
    </div>
  );
}
