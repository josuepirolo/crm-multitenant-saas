import { createClient } from "@/lib/supabase/server";

/**
 * Client HTTP do backend WhatsApp (BFF — ADR-006).
 *
 * Infra contract-independent: repassa o `access_token` do PRÓPRIO usuário como
 * `Bearer` ao backend WA (que valida `wa_tenant_members`), lê a base URL de
 * `WA_BACKEND_URL` (server-only), aplica timeout e mapeia respostas não-2xx para
 * erros tipados. NUNCA loga o token, QR ou credentials.
 *
 * Este módulo é server-only (usa cookies via createClient e env sem NEXT_PUBLIC_).
 * Não deve ser importado por Client Components.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/** Backend WA não configurado (env `WA_BACKEND_URL` ausente). */
export class WaBackendNotConfiguredError extends Error {
  constructor() {
    super("WA_BACKEND_URL não configurada.");
    this.name = "WaBackendNotConfiguredError";
  }
}

/** Resposta não-2xx do backend WA. Carrega só o status — nunca o corpo bruto. */
export class WaBackendHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Backend WA respondeu ${status}.`);
    this.name = "WaBackendHttpError";
  }
}

/** Falha de rede / timeout ao alcançar o backend WA. */
export class WaBackendUnreachableError extends Error {
  constructor() {
    super("Backend WA inacessível.");
    this.name = "WaBackendUnreachableError";
  }
}

function getBaseUrl(): string {
  const url = process.env.WA_BACKEND_URL?.trim();
  if (!url) throw new WaBackendNotConfiguredError();
  return url.replace(/\/+$/, "");
}

/**
 * Obtém o access_token (JWT Supabase) do usuário autenticado, server-side.
 * Retorna null se não houver sessão — o caller decide como tratar.
 * O token NUNCA deve ser logado nem retornado ao client.
 */
export async function getUserAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

interface WaBackendRequest {
  /** Caminho começando com "/" (ex.: "/management/tenants/{id}/instances"). */
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JWT do usuário a repassar como Bearer. */
  accessToken: string;
  /** Corpo JSON (serializado automaticamente) — só para POST/PUT. */
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Faz uma chamada autenticada ao backend WA e devolve o JSON tipado como `T`.
 *
 * NÃO valida o shape de `T` — a tipagem por endpoint vive na camada de
 * repository, contra os contratos do backend (`management-instances.md` etc.).
 * Lança:
 *  - WaBackendNotConfiguredError  se `WA_BACKEND_URL` ausente
 *  - WaBackendHttpError(status)   em resposta não-2xx (sem vazar o corpo)
 *  - WaBackendUnreachableError    em timeout/erro de rede
 */
export async function waBackendFetch<T>(req: WaBackendRequest): Promise<T> {
  const baseUrl = getBaseUrl();
  const { path, method = "GET", accessToken, body, timeoutMs = DEFAULT_TIMEOUT_MS } = req;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    // AbortError (timeout) ou falha de rede — não expor detalhe interno.
    throw new WaBackendUnreachableError();
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Drena o corpo para liberar a conexão, mas NUNCA o propaga (pode conter
    // detalhe interno do provider). Só o status é carregado adiante.
    await res.text().catch(() => undefined);
    throw new WaBackendHttpError(res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Upload multipart (mídia) ao backend WA. Mesmos invariantes de erro/timeout do
 * `waBackendFetch`, mas envia `FormData` (sem Content-Type manual — o fetch define
 * o boundary). Repassa o JWT do usuário. NUNCA loga o token nem o corpo de erro.
 */
export async function waBackendUpload<T>(req: {
  path: string;
  accessToken: string;
  form: FormData;
  timeoutMs?: number;
}): Promise<T> {
  const baseUrl = getBaseUrl();
  const { path, accessToken, form, timeoutMs = 30_000 } = req;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new WaBackendUnreachableError();
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    await res.text().catch(() => undefined);
    throw new WaBackendHttpError(res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** True se o backend WA está configurado (sem expor a URL). */
export function isWaBackendConfigured(): boolean {
  return Boolean(process.env.WA_BACKEND_URL?.trim());
}
