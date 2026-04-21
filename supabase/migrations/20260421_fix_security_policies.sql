-- =============================================
-- Fix: 3 falhas de segurança identificadas na auditoria
-- =============================================

-- 1. current_workspace_id: validar que o workspace pertence ao usuário
DROP POLICY IF EXISTS "atualizar proprio perfil" ON profiles;
CREATE POLICY "atualizar proprio perfil" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_superadmin = (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    AND is_owner      = (SELECT is_owner      FROM profiles WHERE id = auth.uid())
    AND (
      current_workspace_id IS NULL
      OR current_workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  );

-- 2. messages: bloquear DELETE (audit log — nunca deletar)
DROP POLICY IF EXISTS "acesso a mensagens do workspace" ON messages;

CREATE POLICY "ver mensagens do workspace" ON messages
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "criar mensagens do workspace" ON messages
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "mensagens_no_delete" ON messages
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

-- 3. is_superadmin e is_owner: RESTRICTIVE mais forte via DENY explícito
DROP POLICY IF EXISTS "superadmin_immutable" ON profiles;
CREATE POLICY "superadmin_immutable" ON profiles
  AS RESTRICTIVE
  FOR UPDATE
  USING (true)
  WITH CHECK (
    is_superadmin = (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    AND is_owner  = (SELECT is_owner      FROM profiles WHERE id = auth.uid())
    OR current_role = 'service_role'
  );
