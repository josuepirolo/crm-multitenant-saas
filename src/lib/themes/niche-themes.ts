/** Mapeamento de slug de nicho → classe CSS injetada no root do dashboard. */
const NICHE_THEME_MAP: Record<string, string> = {
  'auto-parts':       'theme-auto-parts',
  'auto-parts-heavy': 'theme-auto-parts',
  'auto-parts-light': 'theme-auto-parts',
  'auto-parts-agro':  'theme-auto-parts',
  'auto-parts-moto':  'theme-auto-parts',
  'moda':             'theme-fashion',
  'moda-feminina':    'theme-fashion',
  'moda-masculina':   'theme-fashion',
  'moda-infantil':    'theme-fashion',
  'moda-evangelica':  'theme-fashion',
  'calcados':         'theme-fashion',
};

export function getNicheThemeClass(nicheSlug?: string | null): string {
  if (!nicheSlug) return '';
  return NICHE_THEME_MAP[nicheSlug] ?? '';
}
