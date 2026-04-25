import { headers } from "next/headers";

/** Extracts the real client IP from request headers (Cloudflare / reverse proxy aware). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return h.get("user-agent") ?? "unknown";
}
