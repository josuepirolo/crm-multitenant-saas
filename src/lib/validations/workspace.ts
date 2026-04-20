import { z } from "zod";

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres.").max(100, "Máximo 100 caracteres.").trim(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("E-mail inválido.").toLowerCase().trim(),
  role: z.enum(["admin", "manager", "sales", "support"] as const, {
    error: "Função inválida.",
  }),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid("ID inválido."),
  role: z.enum(["admin", "manager", "sales", "support"] as const, {
    error: "Função inválida.",
  }),
});

export type UpdateWorkspaceFormValues = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
