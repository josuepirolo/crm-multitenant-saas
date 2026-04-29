-- Fix definitivo: remove TODAS as policies de workspace_members e recria
-- usando apenas funções SECURITY DEFINER (sem subquery direta na própria tabela).

-- ─── Remove todas as policies existentes ──────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'workspace_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', pol.policyname);
  END LOOP;
END $$;

-- ─── Recria com SECURITY DEFINER — sem recursão ───────────────────────────────

-- SELECT: qualquer membro do workspace vê os outros membros
-- my_workspace_ids() é SECURITY DEFINER — não ativa RLS ao ler workspace_members
CREATE POLICY "ver membros do meu workspace" ON workspace_members
  FOR SELECT
  USING (workspace_id IN (SELECT my_workspace_ids()));

-- INSERT/UPDATE/DELETE: somente owner ou admin do workspace
-- is_admin_in_workspace() é SECURITY DEFINER — não ativa RLS ao ler workspace_members
CREATE POLICY "owner e admin gerenciam membros" ON workspace_members
  FOR INSERT
  WITH CHECK (is_admin_in_workspace(workspace_id));

CREATE POLICY "owner e admin atualizam membros" ON workspace_members
  FOR UPDATE
  USING     (is_admin_in_workspace(workspace_id))
  WITH CHECK (is_admin_in_workspace(workspace_id));

CREATE POLICY "owner e admin removem membros" ON workspace_members
  FOR DELETE
  USING (is_admin_in_workspace(workspace_id));
