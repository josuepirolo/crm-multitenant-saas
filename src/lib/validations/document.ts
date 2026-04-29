/** Remove qualquer caractere não numérico */
export function stripDocument(value: string): string {
  return value.replace(/\D/g, "");
}

/** CPF: 000.000.000-00 */
export function maskCpf(digits: string): string {
  return digits
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** CNPJ: 00.000.000/0000-00 */
export function maskCnpj(digits: string): string {
  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

/** Aplica máscara automática baseada no comprimento */
export function maskDocument(raw: string): string {
  const d = stripDocument(raw);
  if (d.length <= 11) return maskCpf(d);
  return maskCnpj(d);
}

/** Validação matemática de CPF (Receita Federal) */
export function validateCpf(raw: string): boolean {
  const d = stripDocument(raw);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  return check === parseInt(d[10]);
}

/** Validação matemática de CNPJ (Receita Federal) */
export function validateCnpj(raw: string): boolean {
  const d = stripDocument(raw);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d[i]) * weights1[i];
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (check !== parseInt(d[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(d[i]) * weights2[i];
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return check === parseInt(d[13]);
}

/** Valida CPF ou CNPJ automaticamente pelo comprimento */
export function validateDocument(raw: string): boolean {
  const d = stripDocument(raw);
  if (d.length === 11) return validateCpf(d);
  if (d.length === 14) return validateCnpj(d);
  return false;
}

export function documentType(raw: string): "cpf" | "cnpj" | null {
  const len = stripDocument(raw).length;
  if (len === 11) return "cpf";
  if (len === 14) return "cnpj";
  return null;
}
