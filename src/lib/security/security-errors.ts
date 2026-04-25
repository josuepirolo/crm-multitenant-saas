/** Generic message shown when rate limit is exceeded — does not reveal internal state. */
export const RATE_LIMIT_ERROR =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

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
