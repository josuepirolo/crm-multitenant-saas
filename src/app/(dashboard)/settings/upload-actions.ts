"use server";

// eslint-disable-next-line no-restricted-imports -- uploadUserAvatar é escopo do próprio usuário (auth.uid()), não do workspace
import { createClient } from "@/lib/supabase/server";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { publicError } from "@/lib/security/security-errors";
import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { revalidatePath } from "next/cache";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

function getExt(type: AllowedType) {
  return type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
}

function validateMagicBytes(buf: ArrayBuffer, type: string): boolean {
  const b = new Uint8Array(buf, 0, 12);
  if (type === "image/jpeg") return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  if (type === "image/png")  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  if (type === "image/webp") {
    // RIFF....WEBP
    return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
           b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  }
  return false;
}

function validateImageFile(file: unknown, maxBytes: number): { error: string } | { file: File } {
  if (!file || !(file instanceof File) || file.size === 0) return { error: "Arquivo inválido." };
  if (file.size > maxBytes) return { error: `Imagem muito grande (máx ${maxBytes / 1024 / 1024} MB).` };
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Formato inválido. Use JPG, PNG ou WebP." };
  }
  return { file };
}

export async function uploadWorkspaceLogo(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("settings", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const validated = validateImageFile(formData.get("file"), 5 * 1024 * 1024);
  if ("error" in validated) return { error: validated.error };
  const { file } = validated;

  const ext  = getExt(file.type as AllowedType);
  const path = `${ctx.workspaceId}/logo.${ext}`;

  const supabase  = await getScopedSupabaseClient();
  const arrayBuf  = await file.arrayBuffer();

  if (!validateMagicBytes(arrayBuf, file.type)) return { error: "Arquivo inválido." };

  const { error: uploadError } = await supabase.storage
    .from("workspace-logos")
    .upload(path, arrayBuf, { upsert: true, contentType: file.type });

  if (uploadError) return publicError(uploadError, "Erro ao fazer upload da logo.");

  const { data: { publicUrl } } = supabase.storage.from("workspace-logos").getPublicUrl(path);

  try {
    const repo      = new SupabaseWorkspaceRepository(supabase);
    const workspace = await repo.update(ctx.workspaceId, { logo_url: publicUrl });

    await createAuditLog({
      action:       AUDIT_ACTIONS.WORKSPACE_LOGO_UPDATED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "workspace",
      entity_id:    ctx.workspaceId,
      ip_address:   await getClientIp(),
    });

    revalidatePath("/settings");
    return { error: undefined, workspace };
  } catch (err) {
    return publicError(err, "Erro ao salvar logo.");
  }
}

export async function uploadUserAvatar(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const validated = validateImageFile(formData.get("file"), 2 * 1024 * 1024);
  if ("error" in validated) return { error: validated.error };
  const { file } = validated;

  const ext      = getExt(file.type as AllowedType);
  const path     = `${user.id}/avatar.${ext}`;
  const arrayBuf = await file.arrayBuffer();

  if (!validateMagicBytes(arrayBuf, file.type)) return { error: "Arquivo inválido." };

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, arrayBuf, { upsert: true, contentType: file.type });

  if (uploadError) return publicError(uploadError, "Erro ao fazer upload do avatar.");

  // Bucket privado — signed URL com validade de 1 ano
  const { data: signedData, error: signedError } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 365 * 24 * 60 * 60);

  if (signedError || !signedData) return publicError(signedError, "Erro ao gerar URL do avatar.");

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: signedData.signedUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) return publicError(updateError, "Erro ao atualizar perfil.");

  await createAuditLog({
    action:      AUDIT_ACTIONS.USER_AVATAR_UPDATED,
    user_id:     user.id,
    entity_type: "profile",
    entity_id:   user.id,
    ip_address:  await getClientIp(),
  });

  revalidatePath("/settings");
  return { error: undefined, avatarUrl: signedData.signedUrl };
}
