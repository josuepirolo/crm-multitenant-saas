"use server";

import { z } from "zod";
import { authorizeWaOperation, mapWaError } from "../_helpers";
import { WaBackendOperationalRepository } from "@/repositories/wa-operational.repository";
import { SendWaMessageUseCase } from "@/usecases/WaOperationalUseCases";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import type { WaMessageSent } from "@/types";

const repo = () => new WaBackendOperationalRepository();

const sendSchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, "Destinatário obrigatório.")
    .regex(/^(\d{10,15}|[\d]+-group)$/, "Destinatário inválido. Use E.164 (ex: 5544999990000) ou ID de grupo."),
  type: z.enum(["text", "image", "audio", "video", "document"]),
  text: z.string().trim().max(4096).optional(),
  media_url: z.string().url("URL de mídia inválida.").optional(),
  caption: z.string().trim().max(1024).optional(),
  filename: z.string().trim().max(255).optional(),
}).refine((d) => d.type !== "text" || (d.text && d.text.length > 0), {
  message: "Texto da mensagem é obrigatório.",
  path: ["text"],
}).refine((d) => d.type === "text" || (d.media_url && d.media_url.length > 0), {
  message: "URL de mídia é obrigatória para este tipo.",
  path: ["media_url"],
});

export async function sendWaMessage(
  tenantId: string,
  instanceId: string,
  payload: {
    to: string;
    type: string;
    text?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
  }
): Promise<{ error?: string; sent?: WaMessageSent }> {
  const auth = await authorizeWaOperation(tenantId, instanceId, "view");
  if ("error" in auth) return { error: auth.error };

  const parsed = sendSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const sent = await new SendWaMessageUseCase(repo()).execute(
      tenantId,
      instanceId,
      parsed.data as Parameters<SendWaMessageUseCase["execute"]>[2],
      auth.token
    );
    // Auditoria: sem texto/corpo da mensagem (ADR-001 — sem PII em logs).
    await createAuditLog({
      action: AUDIT_ACTIONS.WA_MESSAGE_SENT,
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      entity_type: "wa_message",
      entity_id: sent.message_id,
      ip_address: await getClientIp(),
      metadata: { tenant_id: tenantId, instance_id: instanceId, type: parsed.data.type, source: "user" },
    });
    return { sent };
  } catch (err) {
    return { error: mapWaError(err) };
  }
}
