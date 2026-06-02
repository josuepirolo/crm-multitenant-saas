-- Carteira de clientes: assigned_to em contacts + contact_access para compartilhamento pontual

-- 1. Coluna de responsável em contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);

-- 2. Tabela de acesso compartilhado (cross-carteira)
CREATE TABLE IF NOT EXISTS contact_access (
  contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_access_user ON contact_access(user_id);

ALTER TABLE contact_access ENABLE ROW LEVEL SECURITY;

-- 3. Substitui a policy blanket de contatos por políticas de carteira
-- Regra: assigned_to IS NULL → visível a todos; assigned → só o responsável,
--        owner/admin/manager, ou quem tiver acesso explícito via contact_access.
DROP POLICY IF EXISTS "acesso total a contatos do workspace" ON contacts;

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
      OR id IN (SELECT contact_id FROM contact_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "contacts_insert_workspace" ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

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
      OR id IN (SELECT contact_id FROM contact_access WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

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
      OR id IN (SELECT contact_id FROM contact_access WHERE user_id = auth.uid())
    )
  );

-- 4. RLS em contact_access
-- SELECT: qualquer membro do workspace pode ver quem tem acesso a um contato
CREATE POLICY "contact_access_select" ON contact_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE id = contact_access.contact_id
        AND workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- INSERT/DELETE: somente owner/admin/manager podem gerenciar compartilhamentos
CREATE POLICY "contact_access_insert" ON contact_access
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = contact_access.contact_id
        AND wm.user_id   = auth.uid()
        AND wm.deleted_at IS NULL
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "contact_access_delete" ON contact_access
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = contact_access.contact_id
        AND wm.user_id   = auth.uid()
        AND wm.deleted_at IS NULL
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );
