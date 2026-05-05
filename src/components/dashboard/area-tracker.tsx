"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { recordAreaView } from "@/app/(dashboard)/area-tracking-actions";

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutos
const STORAGE_KEY = "area_tracker_last";

function getLastViewed(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setLastViewed(area: string, ts: number) {
  try {
    const map = getLastViewed();
    map[area] = ts;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function AreaTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    const area = pathname.split("/").filter(Boolean)[0] ?? "root";
    const last = getLastViewed();
    const now = Date.now();

    // Debounce: não registra se já foi registrado nos últimos 5 min para esta área
    if (last[area] && now - last[area] < DEBOUNCE_MS) return;

    setLastViewed(area, now);
    recordAreaView(pathname).catch(() => {});
  }, [pathname]);

  return null;
}
