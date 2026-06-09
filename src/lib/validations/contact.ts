import { z } from "zod";

// ─── normalização ────────────────────────────────────────────────────────────
export const toDigits = (v: string) => v.replace(/[^0-9]/g, "");

/**
 * Normaliza número brasileiro para E.164 sem o "+":
 *   - Remove caracteres não-numéricos
 *   - Adiciona DDI 55 se ausente
 *   - Injeta nono dígito se: número (pós-DDD) tem 8 dígitos E começa com 6-9 (celular)
 *
 * Casos tratados pelo comprimento dos dígitos:
 *   10 → DDD(2) + nº(8)             → adiciona DDI + nono se celular
 *   11 → DDD(2) + nº(9)             → adiciona DDI (nono já presente ou fixo)
 *   12 começando com 55 → DDI+DDD+nº(8)  → adiciona nono se celular
 *   13 começando com 55 → completo        → retorna como está
 *   demais → retorna dígitos sem alteração (internacional ou inválido)
 *
 * DDI 55 vs DDD 55 (Três Lagoas/MS): não há ambiguidade — o comprimento
 * total determina qual papel o "55" exerce.
 */
export function normalizeBrazilianPhone(raw: string): string {
  const digits = toDigits(raw);
  if (!digits) return digits;

  let ddi: string, ddd: string, number: string;

  if (digits.length === 10) {
    ddi = "55"; ddd = digits.slice(0, 2); number = digits.slice(2);
  } else if (digits.length === 11) {
    ddi = "55"; ddd = digits.slice(0, 2); number = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("55")) {
    ddi = "55"; ddd = digits.slice(2, 4); number = digits.slice(4);
  } else if (digits.length === 13 && digits.startsWith("55")) {
    return digits;
  } else {
    return digits;
  }

  if (number.length === 8 && /^[6-9]/.test(number)) {
    number = "9" + number;
  }

  return ddi + ddd + number;
}

export function normalizePhone(v: string): string {
  return normalizeBrazilianPhone(v);
}

// ─── CPF ─────────────────────────────────────────────────────────────────────
export function validateCPF(value: string): boolean {
  const d = toDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +d[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r >= 10) r = 0;
  return r === +d[10];
}

// ─── CNPJ ────────────────────────────────────────────────────────────────────
export function validateCNPJ(value: string): boolean {
  const d = toDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += +d[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

// ─── máscaras ────────────────────────────────────────────────────────────────
export function maskCPF(v: string): string {
  const d = toDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCNPJ(v: string): string {
  const d = toDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// ─── schema Zod compartilhado ─────────────────────────────────────────────────

// Campos base reutilizados pelos dois schemas (sem refinement aplicado)
const _contactBaseFields = {
  name:       z.string().min(2, "Mínimo 2 caracteres"),
  personType: z.enum(["fisica", "juridica"]),
  document:   z.string().optional().or(z.literal("")),
  phone:      z.string().min(1, "Celular é obrigatório"),
  email:      z.string().email("E-mail inválido").optional().or(z.literal("")),
  company:    z.string().optional(),
  status:     z.enum(["lead", "prospect", "customer", "churned"]),
  notes:      z.string().optional(),
  source_id:  z.string().optional().or(z.literal("")),
};

// Refinement compartilhado (CPF/CNPJ + telefone E.164)
function _contactRefinement(
  data: { personType: string; document?: string; phone?: string },
  ctx: z.RefinementCtx
) {
  const doc = toDigits(data.document ?? "");
  if (doc) {
    if (data.personType === "fisica" && !validateCPF(doc)) {
      ctx.addIssue({ code: "custom", path: ["document"], message: "CPF inválido" });
    }
    if (data.personType === "juridica" && !validateCNPJ(doc)) {
      ctx.addIssue({ code: "custom", path: ["document"], message: "CNPJ inválido" });
    }
  }
  const phone = toDigits(data.phone ?? "");
  if (phone.length < 7 || phone.length > 15) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Celular inválido" });
  }
}

// Schema de importação e validação server-side (source_id opcional)
export const contactSchema = z.object(_contactBaseFields).superRefine(_contactRefinement);

// Schema do formulário manual (source_id obrigatório)
export const contactFormSchema = z.object({
  ..._contactBaseFields,
  source_id: z.string().min(1, "Origem é obrigatória"),
}).superRefine(_contactRefinement);

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const contactSourceSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
});

export type ContactSourceFormValues = z.infer<typeof contactSourceSchema>;
