export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export function uniqueSlug(name: string): string {
  const base = generateSlug(name);
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}
