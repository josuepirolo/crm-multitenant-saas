/** Generic message shown when rate limit is exceeded — does not reveal internal state. */
export const RATE_LIMIT_ERROR =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

/** Generic message shown when Supabase Auth rejects the request by failed captcha verification. */
export const CAPTCHA_ERROR = "Verificação de segurança falhou. Tente novamente.";

/**
 * Detects a captcha-verification failure returned by Supabase Auth (GoTrue).
 * GoTrue verifies the Turnstile token itself — our job is just to surface a
 * friendly message instead of the raw "captcha protection: request disallowed (...)".
 */
export function isCaptchaError(message: string): boolean {
  return message.toLowerCase().includes("captcha");
}

/**
 * Logs the real error server-side and returns a safe, generic message to the client.
 * Use in every Server Action catch block to prevent stack traces and internal details
 * from leaking to the user.
 */
export function publicError(err: unknown, publicMsg: string): { error: string } {
  const internal = err instanceof Error ? err.message : String(err);
  console.error("[action-error]", internal.slice(0, 300));
  return { error: publicMsg };
}
