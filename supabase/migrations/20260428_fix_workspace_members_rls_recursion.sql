-- Fix: policy "owner/admin pode gerenciar membros" em workspace_members
-- causava infinite recursion porque o USING subquery referenciava a própria
-- tabela sem SECURITY DEFINER.
--
-- A função is_admin_in_workspace() já existe e é SECURITY DEFINER — ela
-- consulta workspace_members sem ativar RLS, quebrando a recursão.

DROP POLICY IF EXISTS "owner/admin pode gerenciar membros" ON workspace_members;

CREATE POLICY "owner/admin pode gerenciar membros" ON workspace_members
  FOR ALL
  USING     (is_admin_in_workspace(workspace_id))
  WITH CHECK (is_admin_in_workspace(workspace_id));
