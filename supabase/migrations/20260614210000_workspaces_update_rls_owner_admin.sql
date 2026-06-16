-- ============================================================
-- Fix RLS — UPDATE de `workspaces` deve permitir owner E admin
--
-- Bug: a policy "owner pode atualizar workspace" era **owner-only**
--   (id IN (SELECT workspace_id FROM workspace_members WHERE user_id=auth.uid() AND role='owner')).
-- Mas o app concede `settings:edit` a owner **e** admin (matriz hardcoded —
-- admin = settings VCE). Um admin passava no gate da Server Action
-- (getWorkspaceContext "settings"/"edit"), mas o UPDATE via RLS casava 0 linhas,
-- e `repo.update().select().single()` falhava com
--   "Cannot coerce the result to a single JSON object"
-- → afetava uploadWorkspaceLogo, updateWorkspace e updateWorkspaceProfile.
--
-- Correção: usar is_admin_in_workspace() (SECURITY DEFINER, owner+admin,
-- deleted_at IS NULL) — alinha a RLS ao modelo de permissão do app e corrige de
-- quebra a ausência de filtro `deleted_at` na policy antiga.
--
-- Impersonação não é afetada (getScopedSupabaseClient usa admin client, bypassa RLS).
-- Idempotente.
-- ============================================================

DROP POLICY IF EXISTS "owner pode atualizar workspace" ON workspaces;
DROP POLICY IF EXISTS "owner e admin atualizam workspace" ON workspaces;

CREATE POLICY "owner e admin atualizam workspace" ON workspaces
  FOR UPDATE TO authenticated
  USING (is_admin_in_workspace(id))
  WITH CHECK (is_admin_in_workspace(id));
