-- Extensão de contatos por nicho
-- Dados permanentes sobre o contato relevantes ao nicho do workspace
-- Criados como tabelas 1:1 com contacts — só existem se o workspace for do nicho correto

-- ── Auto Parts — perfil do contato para distribuidoras de peças ───────────────

CREATE TABLE IF NOT EXISTS contact_profiles_auto_parts (
  contact_id   UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  company_type TEXT,        -- "transportadora", "oficina", "revendedor", "frota propria"
  fleet_size   INTEGER,     -- tamanho da frota (quantidade de veículos)
  segment      TEXT         -- "heavy", "light", "agro", "moto" — segmento principal da frota
               CHECK (segment IN ('heavy','light','agro','moto') OR segment IS NULL),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_profiles_ap_ws_idx      ON contact_profiles_auto_parts(workspace_id);
CREATE INDEX IF NOT EXISTS contact_profiles_ap_segment_idx ON contact_profiles_auto_parts(workspace_id, segment);

CREATE TRIGGER trg_contact_profiles_auto_parts_updated_at
  BEFORE UPDATE ON contact_profiles_auto_parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Fashion — perfil do contato para lojas de moda ───────────────────────────

CREATE TABLE IF NOT EXISTS contact_profiles_fashion (
  contact_id   UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shirt_size   TEXT,        -- "PP", "P", "M", "G", "GG"
  pants_size   TEXT,        -- "36", "38", "40"...
  shoe_size    TEXT,        -- "36", "37"...
  preferences  TEXT[],      -- ["casual", "evangelica", "fitness", "social"]
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_profiles_fa_ws_idx ON contact_profiles_fashion(workspace_id);

CREATE TRIGGER trg_contact_profiles_fashion_updated_at
  BEFORE UPDATE ON contact_profiles_fashion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE contact_profiles_auto_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_profiles_fashion    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace ve perfis auto parts de seus contatos"
  ON contact_profiles_auto_parts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia perfis auto parts de seus contatos"
  ON contact_profiles_auto_parts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace ve perfis fashion de seus contatos"
  ON contact_profiles_fashion FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia perfis fashion de seus contatos"
  ON contact_profiles_fashion FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
