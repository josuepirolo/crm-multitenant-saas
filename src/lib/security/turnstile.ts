export async function validateTurnstile(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Sem secret key configurada: bloqueia em produção, permite em dev
    return process.env.NODE_ENV !== "production";
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const body = await res.json() as { success: boolean; "error-codes"?: string[] };
    if (!body.success) {
      console.warn("[turnstile] validation failed:", body["error-codes"]);
    }
    return body.success === true;
  } catch (err) {
    console.error("[turnstile] fetch error:", err);
    return false;
  }
}
