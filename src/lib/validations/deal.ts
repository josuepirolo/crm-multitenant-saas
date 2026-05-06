import { z } from "zod";

export const createDealSchema = z.object({
  pipeline_id: z.string().uuid("Pipeline inválido."),
  stage_id:    z.string().uuid("Etapa inválida."),
  title:       z.string().min(1, "Título é obrigatório.").max(120, "Máximo de 120 caracteres."),
  value:       z.coerce.number().min(0, "Valor deve ser zero ou positivo.").optional().nullable(),
  contact_id:  z.string().uuid().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
});

export const updateDealSchema = z.object({
  deal_id: z.string().uuid(),
  title:   z.string().min(1, "Título é obrigatório.").max(120, "Máximo de 120 caracteres."),
  value:   z.coerce.number().min(0).optional().nullable(),
  contact_id:          z.string().uuid().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
});

export const moveDealSchema = z.object({
  deal_id:  z.string().uuid(),
  stage_id: z.string().uuid(),
  position: z.number().int().min(0),
});

export const closeDealSchema = z.object({
  deal_id: z.string().uuid(),
  status:  z.enum(["won", "lost"]),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type MoveDealInput   = z.infer<typeof moveDealSchema>;
export type CloseDealInput  = z.infer<typeof closeDealSchema>;
