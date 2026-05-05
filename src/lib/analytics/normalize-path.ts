/** Normaliza rotas dinâmicas para agrupamento no audit log. */

// Segmentos que são claramente IDs (UUID, número, slug longo)
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^\d+$|^[a-z0-9]{20,}$/i;

export function normalizePath(path: string): string {
  const segments = path.split("/").map(seg =>
    ID_PATTERN.test(seg) ? "[id]" : seg
  );
  return segments.join("/");
}

/** Extrai nome da área a partir do path normalizado. */
export function pathToArea(path: string): string {
  const normalized = normalizePath(path);
  const first = normalized.split("/").filter(Boolean)[0] ?? "root";
  const AREA_MAP: Record<string, string> = {
    "dashboard":  "dashboard",
    "contacts":   "contacts",
    "chat":       "chat",
    "kanban":     "kanban",
    "analytics":  "analytics",
    "settings":   "settings",
    "auto-parts": "auto-parts",
    "auto-sales": "auto-sales",
    "fashion":    "fashion",
    "admin":      "admin",
  };
  return AREA_MAP[first] ?? first;
}
