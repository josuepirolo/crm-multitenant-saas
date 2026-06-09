"use server";

import { createClient } from "@/lib/supabase/server";
import { SupabaseContactRepository } from "@/repositories/contact.repository";
import { SupabaseContactSourceRepository } from "@/repositories/contact-source.repository";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";
import {
  GetContactsUseCase, CreateContactUseCase, UpdateContactUseCase, SoftDeleteContactUseCase,
  AssignContactUseCase, GrantContactAccessUseCase, RevokeContactAccessUseCase, ListContactAccessUseCase,
} from "@/usecases/ContactUseCases";
import {
  ListContactSourcesUseCase, CreateContactSourceUseCase, RenameContactSourceUseCase, SetContactSourceActiveUseCase,
} from "@/usecases/ContactSourceUseCases";
import { getWorkspaceContext, getCurrentWorkspaceId } from "@/lib/guards";
import { getUserRole } from "@/lib/user-role";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";
import { getClientIp } from "@/lib/security/client-ip";
import { revalidatePath } from "next/cache";
import { contactSchema, contactSourceSchema, toDigits, validateCPF, validateCNPJ } from "@/lib/validations/contact";
import type { ContactFilters } from "@/repositories/contact.repository";
import type { MemberRole } from "@/types";

// ─── normalização ────────────────────────────────────────────────────────────
function normalizeInput(raw: Record<string, string>) {
  return {
    ...raw,
    phone:    raw.phone    ? toDigits(raw.phone)    || undefined : undefined,
    email:    raw.email    ? raw.email.toLowerCase().trim() || undefined : undefined,
    document: raw.document ? toDigits(raw.document) || undefined : undefined,
  };
}

// ─── validação de documento no backend ───────────────────────────────────────
function validateDocument(personType: string, doc: string | undefined): string | null {
  if (!doc) return null;
  const digits = toDigits(doc);
  if (personType === "fisica")   return validateCPF(digits)  ? null : "CPF inválido.";
  if (personType === "juridica") return validateCNPJ(digits) ? null : "CNPJ inválido.";
  return null;
}

// ─── mapeamento de violação de unicidade ─────────────────────────────────────
function uniqueViolationMessage(err: unknown, empresa?: string): string | null {
  const suffix = empresa ? ` na empresa ${empresa}` : ".";
  const end = (base: string) => empresa ? `${base}${suffix}.` : base;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("idx_contacts_unique_phone") || msg.includes("unique_phone"))    return end("Já existe um contato ativo com este telefone");
  if (msg.includes("idx_contacts_unique_email") || msg.includes("unique_email"))    return end("Já existe um contato ativo com este e-mail");
  if (msg.includes("idx_contacts_unique_document") || msg.includes("unique_document")) return end("Já existe um contato ativo com este CPF/CNPJ");
  if (msg.startsWith("Já existe um contato")) return msg.replace("neste workspace", empresa ? `na empresa ${empresa}` : "nesta empresa");
  return null;
}

// ─── actions ─────────────────────────────────────────────────────────────────

export async function getContacts(filters: ContactFilters, page: number, pageSize: number) {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return { error: ctx.error, data: [], total: 0 };

  try {
    const supabase = await createClient();
    const result = await new GetContactsUseCase(new SupabaseContactRepository(supabase)).execute(ctx.workspaceId, filters, page, pageSize);
    return { error: undefined, data: result.data, total: result.total };
  } catch (err) {
    console.error("[getContacts]", err);
    return { error: "Erro ao buscar contatos.", data: [], total: 0 };
  }
}

export async function createContact(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const raw = normalizeInput(Object.fromEntries(formData) as Record<string, string>);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.source_id) return { error: "Origem é obrigatória." };

  const docError = validateDocument(parsed.data.personType, parsed.data.document);
  if (docError) return { error: docError };

  const supabaseForWsLookup = await createClient();
  const { data: ws } = await supabaseForWsLookup.from("workspaces").select("name").eq("id", ctx.workspaceId).single();
  const empresaNome = ws?.name as string | undefined;

  try {
    const supabase = await createClient();
    const contact = await new CreateContactUseCase(new SupabaseContactRepository(supabase)).execute({
      ...parsed.data,
      workspace_id: ctx.workspaceId,
      created_by: ctx.userId,
    });
    revalidatePath("/contacts");
    return { error: undefined, contact };
  } catch (err) {
    return { error: uniqueViolationMessage(err, empresaNome) ?? "Erro ao criar contato. Tente novamente." };
  }
}

export async function updateContact(_: unknown, formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Dados inválidos." };

  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const raw = normalizeInput(Object.fromEntries(formData) as Record<string, string>);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.source_id) return { error: "Origem é obrigatória." };

  const docError = validateDocument(parsed.data.personType, parsed.data.document);
  if (docError) return { error: docError };

  try {
    const supabase = await createClient();
    const contact = await new UpdateContactUseCase(new SupabaseContactRepository(supabase)).execute(ctx.workspaceId, id, parsed.data);
    revalidatePath("/contacts");
    return { error: undefined, contact };
  } catch (err) {
    return { error: uniqueViolationMessage(err) ?? "Erro ao atualizar contato. Tente novamente." };
  }
}

export async function deleteContact(id: string) {
  const ctx = await getWorkspaceContext("contacts", "delete");
  if ("error" in ctx) return ctx;

  try {
    const supabase = await createClient();
    await new SoftDeleteContactUseCase(new SupabaseContactRepository(supabase)).execute(ctx.workspaceId, id);
    revalidatePath("/contacts");
    return { error: undefined };
  } catch {
    return { error: "Erro ao remover contato." };
  }
}

// ─── carteira de clientes ────────────────────────────────────────────────────

const MANAGER_ROLES: MemberRole[] = ["owner", "admin", "manager"];

async function requireManagerContext() {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;
  const role = await getUserRole(ctx.workspaceId);
  if (!role || !MANAGER_ROLES.includes(role)) {
    return { error: "Apenas gerentes podem realizar esta ação." };
  }
  return ctx;
}

export async function assignContact(contactId: string, userId: string | null) {
  const ctx = await requireManagerContext();
  if ("error" in ctx) return ctx;

  try {
    const supabase = await createClient();
    const contact = await new AssignContactUseCase(new SupabaseContactRepository(supabase))
      .execute(ctx.workspaceId, contactId, userId);
    revalidatePath("/contacts");
    return { error: undefined, contact };
  } catch {
    return { error: "Erro ao atribuir responsável." };
  }
}

export async function grantContactAccess(contactId: string, targetUserId: string) {
  const ctx = await requireManagerContext();
  if ("error" in ctx) return ctx;

  try {
    const supabase = await createClient();
    await new GrantContactAccessUseCase(new SupabaseContactRepository(supabase))
      .execute(contactId, targetUserId, ctx.userId);
    revalidatePath("/contacts");
    return { error: undefined };
  } catch {
    return { error: "Erro ao conceder acesso." };
  }
}

export async function revokeContactAccess(contactId: string, targetUserId: string) {
  const ctx = await requireManagerContext();
  if ("error" in ctx) return ctx;

  try {
    const supabase = await createClient();
    await new RevokeContactAccessUseCase(new SupabaseContactRepository(supabase))
      .execute(contactId, targetUserId);
    revalidatePath("/contacts");
    return { error: undefined };
  } catch {
    return { error: "Erro ao revogar acesso." };
  }
}

export async function listContactAccess(contactId: string) {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return { error: ctx.error, data: [] };

  try {
    const supabase = await createClient();
    const data = await new ListContactAccessUseCase(new SupabaseContactRepository(supabase))
      .execute(contactId);
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar acessos.", data: [] };
  }
}

export async function getWorkspaceMembersForContacts() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: "Workspace não encontrado.", data: [] };

  try {
    const supabase = await createClient();
    const data = await new SupabaseWorkspaceMemberRepository(supabase).findByWorkspace(workspaceId);
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar membros.", data: [] };
  }
}

// ─── origens de contato ──────────────────────────────────────────────────────

export async function listContactSources(options?: { onlyActive?: boolean }) {
  const ctx = await getWorkspaceContext("contacts", "view");
  if ("error" in ctx) return { error: ctx.error, data: [] };

  try {
    const supabase = await createClient();
    const data = await new ListContactSourcesUseCase(new SupabaseContactSourceRepository(supabase))
      .execute(ctx.workspaceId, options);
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar origens.", data: [] };
  }
}

export async function createContactSource(_: unknown, formData: FormData) {
  const ctx = await requireManagerContext();
  if ("error" in ctx) return ctx;

  const parsed = contactSourceSchema.safeParse({ name: (formData.get("name") as string)?.trim() });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    const source = await new CreateContactSourceUseCase(new SupabaseContactSourceRepository(supabase))
      .execute({ workspace_id: ctx.workspaceId, name: parsed.data.name });
    await createAuditLog({
      action:       AUDIT_ACTIONS.CONTACT_SOURCE_CREATED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "contact_source",
      entity_id:    source.id,
      ip_address:   await getClientIp(),
      metadata:     { name: source.name },
    });
    revalidatePath("/contacts");
    return { error: undefined, source };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar origem. Tente novamente." };
  }
}

export async function renameContactSource(id: string, name: string) {
  const ctx = await requireManagerContext();
  if ("error" in ctx) return ctx;

  const parsed = contactSourceSchema.safeParse({ name: name?.trim() });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    const source = await new RenameContactSourceUseCase(new SupabaseContactSourceRepository(supabase))
      .execute(ctx.workspaceId, id, parsed.data.name);
    await createAuditLog({
      action:       AUDIT_ACTIONS.CONTACT_SOURCE_RENAMED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "contact_source",
      entity_id:    source.id,
      ip_address:   await getClientIp(),
      metadata:     { name: source.name },
    });
    revalidatePath("/contacts");
    return { error: undefined, source };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao renomear origem. Tente novamente." };
  }
}

export async function setContactSourceActive(id: string, isActive: boolean) {
  const ctx = await requireManagerContext();
  if ("error" in ctx) return ctx;

  try {
    const supabase = await createClient();
    const source = await new SetContactSourceActiveUseCase(new SupabaseContactSourceRepository(supabase))
      .execute(ctx.workspaceId, id, isActive);
    await createAuditLog({
      action:       AUDIT_ACTIONS.CONTACT_SOURCE_TOGGLED,
      workspace_id: ctx.workspaceId,
      user_id:      ctx.userId,
      entity_type:  "contact_source",
      entity_id:    source.id,
      ip_address:   await getClientIp(),
      metadata:     { name: source.name, is_active: source.is_active },
    });
    revalidatePath("/contacts");
    return { error: undefined, source };
  } catch {
    return { error: "Erro ao atualizar origem." };
  }
}

export async function getContactsPageContext() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { role: null, members: [] };

  const { data: { user } } = await getCachedUser();
  if (!user) return { role: null, members: [] };

  const [role, supabase] = await Promise.all([getUserRole(workspaceId), createClient()]);
  const members = await new SupabaseWorkspaceMemberRepository(supabase)
    .findByWorkspace(workspaceId)
    .catch(() => []);

  return { role, members, userId: user.id };
}
