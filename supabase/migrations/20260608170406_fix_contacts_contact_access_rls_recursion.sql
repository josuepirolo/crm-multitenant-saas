-- Fix: policies de "contacts" e "contact_access" causavam infinite recursion (42P17
-- "infinite recursion detected in policy for relation contacts").
--
-- Causa raiz: cada tabela referenciava a outra diretamente dentro de USING/WITH CHECK
-- (subquery em contact_access dentro das policies de contacts, e subquery em contacts
-- dentro das policies de contact_access). Toda referência a uma tabela dentro de uma
-- policy ativa a RLS dela — formando um ciclo:
--   contacts_select_portfolio/update/delete  →  consulta contact_access
--   contact_access_select/insert/delete      →  consulta contacts
--
-- Mesmo padrão de correção já aplicado em 20260428_fix_workspace_members_rls_recursion.sql:
-- funções SECURITY DEFINER que bypassam RLS na tabela consultada, quebrando o ciclo
-- (my_workspace_ids/is_admin_in_workspace/my_role_in_workspace já seguem essa receita).

-- Bypassa RLS de contact_access — usado pelas policies de contacts para checar
-- acesso compartilhado sem reativar a RLS de contact_access (que consultaria contacts).
CREATE OR REPLACE FUNCTION has_contact_access(p_contact_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM contact_access
    WHERE contact_id = p_contact_id AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Bypassa RLS de contacts — usado pelas policies de contact_access para descobrir
-- o workspace de um contato sem reativar a RLS de contacts (que consultaria contact_access).
CREATE OR REPLACE FUNCTION contact_workspace_id(p_contact_id UUID)
RETURNS UUID AS $$
  SELECT workspace_id FROM contacts WHERE id = p_contact_id
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ─── contacts: troca a subquery direta em contact_access pela função SECURITY DEFINER ───

DROP POLICY IF EXISTS "contacts_select_portfolio" ON contacts;
CREATE POLICY "contacts_select_portfolio" ON contacts
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND (
      assigned_to IS NULL
      OR EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id  = auth.uid()
          AND workspace_id = contacts.workspace_id
          AND deleted_at IS NULL
          AND role IN ('owner', 'admin', 'manager')
      )
      OR assigned_to = auth.uid()
      OR has_contact_access(contacts.id)
    )
  );

DROP POLICY IF EXISTS "contacts_update_portfolio" ON contacts;
CREATE POLICY "contacts_update_portfolio" ON contacts
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND (
      assigned_to IS NULL
      OR EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id  = auth.uid()
          AND workspace_id = contacts.workspace_id
          AND deleted_at IS NULL
          AND role IN ('owner', 'admin', 'manager')
      )
      OR assigned_to = auth.uid()
      OR has_contact_access(contacts.id)
    )
  )
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

DROP POLICY IF EXISTS "contacts_delete_portfolio" ON contacts;
CREATE POLICY "contacts_delete_portfolio" ON contacts
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND (
      assigned_to IS NULL
      OR EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id  = auth.uid()
          AND workspace_id = contacts.workspace_id
          AND deleted_at IS NULL
          AND role IN ('owner', 'admin', 'manager')
      )
      OR assigned_to = auth.uid()
      OR has_contact_access(contacts.id)
    )
  );

-- ─── contact_access: troca a subquery direta em contacts pela função SECURITY DEFINER ───

DROP POLICY IF EXISTS "contact_access_select" ON contact_access;
CREATE POLICY "contact_access_select" ON contact_access
  FOR SELECT TO authenticated
  USING (
    contact_workspace_id(contact_access.contact_id) IN (SELECT my_workspace_ids())
  );

DROP POLICY IF EXISTS "contact_access_insert" ON contact_access;
CREATE POLICY "contact_access_insert" ON contact_access
  FOR INSERT TO authenticated
  WITH CHECK (
    my_role_in_workspace(contact_workspace_id(contact_access.contact_id)) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "contact_access_delete" ON contact_access;
CREATE POLICY "contact_access_delete" ON contact_access
  FOR DELETE TO authenticated
  USING (
    my_role_in_workspace(contact_workspace_id(contact_access.contact_id)) IN ('owner', 'admin', 'manager')
  );
