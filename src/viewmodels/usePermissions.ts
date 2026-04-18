"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

    const supabase = createClient();

    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single();

      setRole((data?.role as MemberRole) ?? null);
      setLoading(false);
    }

    fetchRole();
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
