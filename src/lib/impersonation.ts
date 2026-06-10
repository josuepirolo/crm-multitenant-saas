import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_WID  = process.env.NODE_ENV === "production" ? "__Host-imp-wid"  : "imp-wid";
const COOKIE_BY   = process.env.NODE_ENV === "production" ? "__Host-imp-by"   : "imp-by";
const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-imp-name" : "imp-name";

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path:     "/",
  maxAge:   60 * 60 * 8, // 8h máximo
};

export interface ImpersonationContext {
  workspaceId: string;
  workspaceName: string;
  impersonatedBy: string;
}

export async function setImpersonation(ctx: ImpersonationContext): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_WID,  ctx.workspaceId,    COOKIE_OPTS);
  store.set(COOKIE_BY,   ctx.impersonatedBy, COOKIE_OPTS);
  store.set(COOKIE_NAME, ctx.workspaceName,  COOKIE_OPTS);
}

export async function clearImpersonation(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_WID);
  store.delete(COOKIE_BY);
  store.delete(COOKIE_NAME);
}

export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  try {
    const store = await cookies();
    const wid  = store.get(COOKIE_WID)?.value;
    const by   = store.get(COOKIE_BY)?.value;
    const name = store.get(COOKIE_NAME)?.value;
    if (!wid || !by) return null;
    return { workspaceId: wid, workspaceName: name ?? "Empresa", impersonatedBy: by };
  } catch {
    return null;
  }
}

export async function isImpersonating(): Promise<boolean> {
  return (await getImpersonationContext()) !== null;
}

/**
 * Retorna o workspaceId impersonado para `userId`, mas só se a sessão for
 * válida: o cookie pertence a esse usuário E ele é confirmado superadmin no
 * banco (defesa contra cookie forjado/órfão de usuário comum). Cookies
 * inválidos são ignorados em silêncio aqui — a limpeza acontece no layout,
 * que tem permissão de escrita em cookies (Server Actions/Components que
 * apenas leem contexto não podem mutar cookies).
 */
export async function getValidatedImpersonatedWorkspaceId(userId: string): Promise<string | null> {
  const impersonation = await getImpersonationContext();
  if (!impersonation || impersonation.impersonatedBy !== userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_superadmin")
    .eq("id", userId)
    .single();

  return data?.is_superadmin ? impersonation.workspaceId : null;
}
