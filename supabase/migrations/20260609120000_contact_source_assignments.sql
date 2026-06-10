-- Tabela de vínculo N:N entre contato e origens (múltiplas origens por contato)
CREATE TABLE contact_source_assignments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  source_id    UUID NOT NULL REFERENCES contact_sources(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, source_id)
);

CREATE INDEX idx_csa_contact   ON contact_source_assignments(contact_id);
CREATE INDEX idx_csa_source    ON contact_source_assignments(source_id);
CREATE INDEX idx_csa_workspace ON contact_source_assignments(workspace_id);

ALTER TABLE contact_source_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso total a contact_source_assignments do workspace" ON contact_source_assignments
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- Migra contatos existentes que já tinham source_id para a nova tabela
INSERT INTO contact_source_assignments (contact_id, source_id, workspace_id, created_at)
SELECT c.id, c.source_id, c.workspace_id, c.created_at
FROM contacts c
WHERE c.source_id IS NOT NULL
  AND c.deleted_at IS NULL
ON CONFLICT (contact_id, source_id) DO NOTHING;
