"use server";

import { createClient } from "@/lib/supabase/server";
import { SupabaseContactRepository } from "@/repositories/contact.repository";
import { SupabaseContactSourceRepository } from "@/repositories/contact-source.repository";
import { ImportContactsUseCase } from "@/usecases/ContactUseCases";
import { getWorkspaceContext } from "@/lib/guards";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { publicError } from "@/lib/security/security-errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { parseContactImportFile, extractImportPreview, type ImportPreviewResult } from "@/lib/contacts/parse-contact-import";
import { revalidatePath } from "next/cache";
import type { ContactImportResult } from "@/types";

const ALLOWED_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // .xlsx é pacote ZIP (OOXML)

function validateImportFile(file: unknown): { error: string } | { file: File } {
  if (!file || !(file instanceof File) || file.size === 0) return { error: "Arquivo inválido." };
  if (file.size > MAX_FILE_BYTES) return { error: `Arquivo muito grande (máx ${MAX_FILE_BYTES / 1024 / 1024} MB).` };

  const name = file.name.toLowerCase();
  const hasValidExt = name.endsWith(".csv") || name.endsWith(".xlsx");
  if (!hasValidExt || (file.type && !(ALLOWED_TYPES as readonly string[]).includes(file.type))) {
    return { error: "Formato inválido. Use .xlsx ou .csv." };
  }
  return { file };
}

function looksLikeSpreadsheet(buffer: Buffer, fileName: string): boolean {
  if (fileName.toLowerCase().endsWith(".csv")) {
    // CSV é texto puro — rejeita conteúdo com bytes de controle típicos de binário
    const sample = buffer.subarray(0, 512).toString("utf8");
    return !/[\x00-\x08\x0e-\x1f]/.test(sample);
  }
  return ZIP_SIGNATURE.every((byte, index) => buffer[index] === byte);
}

export async function previewImportAction(
  _: unknown,
  formData: FormData
): Promise<{ error?: string; preview?: ImportPreviewResult }> {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return { error: ctx.error };

  const validated = validateImportFile(formData.get("file"));
  if ("error" in validated) return { error: validated.error };
  const { file } = validated;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeSpreadsheet(buffer, file.name)) return { error: "Arquivo inválido." };

  const preview = await extractImportPreview(buffer, file.name);
  if (preview.error) return { error: preview.error };

  return { preview };
}

export async function importContactsAction(
  _: unknown,
  formData: FormData
): Promise<{ error?: string; result?: ContactImportResult }> {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return { error: ctx.error };

  const offset    = parseInt((formData.get("offset")     as string) || "0",    10);
  const chunkSize = parseInt((formData.get("chunk_size") as string) || "2000", 10);
  const isFirstChunk = offset === 0;

  // Rate limit aplicado apenas no primeiro lote para não penalizar importações em N lotes
  if (isFirstChunk) {
    const allowed = await checkRateLimit(`contacts-import:${ctx.workspaceId}:${ctx.userId}`, RATE_LIMITS.contactsBulkImport);
    if (!allowed) {
      await createAuditLog({
        action:       AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED,
        workspace_id: ctx.workspaceId,
        user_id:      ctx.userId,
        entity_type:  "contacts_import",
        ip_address:   await getClientIp(),
        metadata:     { scope: "contacts_bulk_import" },
      });
      return { error: "Muitas importações em pouco tempo. Tente novamente mais tarde." };
    }
  }

  const validated = validateImportFile(formData.get("file"));
  if ("error" in validated) return { error: validated.error };
  const { file } = validated;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeSpreadsheet(buffer, file.name)) return { error: "Arquivo inválido." };

  const fallbackSourceId = (formData.get("fallback_source_id") as string | null) || null;

  const parsedFile = await parseContactImportFile(buffer, file.name, { offset, limit: chunkSize });
  if (parsedFile.error) return { error: parsedFile.error };
  if (parsedFile.rows.length === 0) return { error: undefined, result: { total: 0, created: 0, skipped: 0, errors: [] } };

  try {
    const supabase = await createClient();
    const result = await new ImportContactsUseCase(
      new SupabaseContactRepository(supabase),
      new SupabaseContactSourceRepository(supabase)
    ).execute(
      ctx.workspaceId,
      ctx.userId,
      parsedFile.rows,
      fallbackSourceId
    );

    // Audit log apenas no primeiro lote (representa o início da operação)
    if (isFirstChunk) {
      await createAuditLog({
        action:       AUDIT_ACTIONS.CONTACTS_BULK_IMPORTED,
        workspace_id: ctx.workspaceId,
        user_id:      ctx.userId,
        entity_type:  "contact",
        ip_address:   await getClientIp(),
        metadata:     { offset, chunk_size: chunkSize, created: result.created, skipped: result.skipped },
      });
    }

    revalidatePath("/contacts");
    return { error: undefined, result };
  } catch (err) {
    return publicError(err, "Erro ao importar contatos. Tente novamente.");
  }
}
