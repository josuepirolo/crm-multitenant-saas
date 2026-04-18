import type { MemberRole, PermissionModule, PermissionAction } from "@/types";

type PermissionMatrix = Record<MemberRole, Record<PermissionModule, PermissionAction[]>>;

const ALL: PermissionAction[] = ["view", "create", "edit", "delete"];
const VCE: PermissionAction[] = ["view", "create", "edit"];
const VIEW: PermissionAction[] = ["view"];
const NONE: PermissionAction[] = [];

export const PERMISSIONS: PermissionMatrix = {
  owner: {
    leads:     ALL,
    contacts:  ALL,
    deals:     ALL,
    chat:      ALL,
    analytics: ALL,
    settings:  ALL,
    members:   ALL,
  },
  admin: {
    leads:     ALL,
    contacts:  ALL,
    deals:     ALL,
    chat:      ALL,
    analytics: ALL,
    settings:  VCE,
    members:   VCE,
  },
  manager: {
    leads:     ALL,
    contacts:  ALL,
    deals:     ALL,
    chat:      VCE,
    analytics: VCE,
    settings:  VIEW,
    members:   VIEW,
  },
  sales: {
    leads:     VCE,
    contacts:  VCE,
    deals:     VCE,
    chat:      VCE,
    analytics: VIEW,
    settings:  NONE,
    members:   NONE,
  },
  support: {
    leads:     VIEW,
    contacts:  VCE,
    deals:     VIEW,
    chat:      ALL,
    analytics: NONE,
    settings:  NONE,
    members:   NONE,
  },
};

export function can(
  role: MemberRole | null | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.[module]?.includes(action) ?? false;
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner:   "Proprietário",
  admin:   "Administrador",
  manager: "Gerente",
  sales:   "Vendas",
  support: "Suporte",
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  leads:     "Leads",
  contacts:  "Contatos",
  deals:     "Negociações",
  chat:      "Chat",
  analytics: "Analytics",
  settings:  "Configurações",
  members:   "Membros",
};
