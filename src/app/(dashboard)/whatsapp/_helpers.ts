import { z } from "zod";
import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { getUserAccessToken, WaBackendNotConfiguredError, WaBackendHttpError, WaBackendUnreachableError } from "@/lib/wa-backend/client";
import { SupabaseWorkspaceIntegrationRepository } from "@/repositories/workspace-integration.repository";

export const NO_ACCESS  = "Sua conta não tem acesso a esta instância WhatsApp. Fale com o suporte.";
export const UNAVAILABLE = "Serviço de WhatsApp indisponível no momento. Tente novamente.";
export const NOT_CONFIGURED = "Integração WhatsApp ainda não está configurada.";
export const INVALID = "Requisição inválida.";

export const uuid = z.string().uuid();

/** Traduz erros do backend WA para mensagem pública — nunca vaza corpo/stack/token. */
export function mapWaError(err: unknown, context?: "group" | "campaign"): string {
  console.error("[wa-bff]", err instanceof Error ? err.message.slice(0, 200) : String(err));
  if (err instanceof WaBackendNotConfiguredError) return NOT_CONFIGURED;
  if (err instanceof WaBackendHttpError) {
    switch (err.status) {
      case 400: return "Telefone(s) não encontrado(s) no WhatsApp. Verifique os números informados.";
      case 401: return NO_ACCESS;
      case 403: return context === "group"
        ? "Sem permissão para administrar grupos. Requer papel owner, admin ou manager."
        : "Plano atual não inclui este recurso. Fale com o suporte.";
      case 409: return "Instância WhatsApp desconectada ou grupo em estado inválido. Verifique a conexão e tente novamente.";
      case 422: return "Dados inválidos. Verifique os campos e tente novamente.";
      default: return UNAVAILABLE;
    }
  }
  if (err instanceof WaBackendUnreachableError) return UNAVAILABLE;
  return UNAVAILABLE;
}

export type AuthorizeResult =
  | { error: string }
  | { workspaceId: string; userId: string; token: string };

/**
 * Gate RBAC + anti-IDOR para operações do console WA.
 * Valida UUIDs → getWorkspaceContext → tenantId pertence ao workspace → token.
 */
export async function authorizeWaOperation(
  tenantId: string,
  instanceId: string,
  permission: "view" | "edit"
): Promise<AuthorizeResult> {
  if (!uuid.safeParse(tenantId).success || !uuid.safeParse(instanceId).success) {
    return { error: INVALID };
  }
  const ctx = await getWorkspaceContext("settings", permission);
  if ("error" in ctx) return { error: ctx.error };

  const client = await getScopedSupabaseClient();
  const links = await new SupabaseWorkspaceIntegrationRepository(client)
    .listWaTenantLinksByWorkspace(ctx.workspaceId);
  if (!links.some((l) => l.wa_tenant_id === tenantId)) return { error: NO_ACCESS };

  const token = await getUserAccessToken();
  if (!token) return { error: NO_ACCESS };

  return { workspaceId: ctx.workspaceId, userId: ctx.userId, token };
}
