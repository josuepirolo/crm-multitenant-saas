"use client";

import { useEffect, useState } from "react";
import { getUserRole } from "@/lib/guards";
import { can, PERMISSIONS } from "@/lib/permissions";
import type { MemberRole, PermissionModule, PermissionAction } from "@/types";

interface UsePermissionsReturn {
  role: MemberRole | null;
  loading: boolean;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isAtLeastManager: boolean;
}

export function usePermissions(workspaceId: string | null): UsePermissionsReturn {
  const [role, setRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }

    getUserRole(workspaceId).then((r) => {
      setRole(r);
      setLoading(false);
    });
  }, [workspaceId]);

  return {
    role,
    loading,
    can: (module, action) => can(role, module, action),
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isAtLeastManager: role === "owner" || role === "admin" || role === "manager",
  };
}

export { PERMISSIONS, can };
