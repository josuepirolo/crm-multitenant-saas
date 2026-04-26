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
    const { success } = await res.json() as { success: boolean };
    return success === true;
  } catch {
    return false;
  }
}
