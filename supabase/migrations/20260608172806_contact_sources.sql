-- Tabela auxiliar de origens/canais de contato (workspace-scoped, criar/ativar/inativar)
CREATE TABLE contact_sources (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_contact_sources_workspace ON contact_sources(workspace_id);

CREATE TRIGGER trg_contact_sources_updated_at
  BEFORE UPDATE ON contact_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE contact_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso total a contact_sources do workspace" ON contact_sources
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- Referência de origem em contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES contact_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_source_id ON contacts(source_id);
