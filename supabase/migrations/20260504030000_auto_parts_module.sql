-- Módulo Auto Parts — distribuidoras e lojas de peças automotivas
-- Catálogo global + compatibilidade many-to-many + precificação por workspace

-- ── Catálogo de peças (global) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_parts_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number  TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL,  -- "Carroceria", "Motor", "Suspensão", "Elétrica"...
  color        TEXT,           -- atributo fixo da peça quando relevante
  unit         TEXT NOT NULL DEFAULT 'UN',  -- "UN", "KG", "M", "L"
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (part_number)
);

CREATE INDEX IF NOT EXISTS auto_parts_catalog_category_idx ON auto_parts_catalog(category);
CREATE INDEX IF NOT EXISTS auto_parts_catalog_active_idx   ON auto_parts_catalog(is_active) WHERE is_active = TRUE;

CREATE TRIGGER trg_auto_parts_catalog_updated_at
  BEFORE UPDATE ON auto_parts_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Compatibilidade peça ↔ modelo de veículo (many-to-many) ──────────────────

CREATE TABLE IF NOT EXISTS auto_parts_compatibility (
  part_id   UUID NOT NULL REFERENCES auto_parts_catalog(id) ON DELETE CASCADE,
  model_id  UUID NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  notes     TEXT,  -- "requer adaptador ref. X", "somente câmbio manual"
  PRIMARY KEY (part_id, model_id)
);

CREATE INDEX IF NOT EXISTS auto_parts_compat_model_idx ON auto_parts_compatibility(model_id);

-- ── Precificação por workspace ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_parts_workspace_pricing (
  part_id      UUID NOT NULL REFERENCES auto_parts_catalog(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cost_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  markup_pct   NUMERIC(8,2)  GENERATED ALWAYS AS (
    ROUND((sale_price - cost_price) / NULLIF(cost_price, 0) * 100, 2)
  ) STORED,
  margin_pct   NUMERIC(8,2)  GENERATED ALWAYS AS (
    ROUND((sale_price - cost_price) / NULLIF(sale_price, 0) * 100, 2)
  ) STORED,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (part_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS auto_parts_pricing_ws_idx ON auto_parts_workspace_pricing(workspace_id);

CREATE TRIGGER trg_auto_parts_pricing_updated_at
  BEFORE UPDATE ON auto_parts_workspace_pricing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Orçamentos (quotes) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_parts_quotes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','approved','rejected','expired')),
  notes        TEXT,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auto_parts_quotes_ws_idx      ON auto_parts_quotes(workspace_id);
CREATE INDEX IF NOT EXISTS auto_parts_quotes_contact_idx ON auto_parts_quotes(contact_id);
CREATE INDEX IF NOT EXISTS auto_parts_quotes_status_idx  ON auto_parts_quotes(workspace_id, status);

CREATE TRIGGER trg_auto_parts_quotes_updated_at
  BEFORE UPDATE ON auto_parts_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Itens do orçamento (snapshot no momento da cotação) ───────────────────────

CREATE TABLE IF NOT EXISTS auto_parts_quote_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        UUID NOT NULL REFERENCES auto_parts_quotes(id) ON DELETE CASCADE,
  -- snapshot: não depende da peça original após criação
  part_id         UUID REFERENCES auto_parts_catalog(id) ON DELETE SET NULL,
  part_number_snap TEXT NOT NULL,   -- snapshot do part_number
  name_snap        TEXT NOT NULL,   -- snapshot do nome
  color_snap       TEXT,
  unit_snap        TEXT NOT NULL DEFAULT 'UN',
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price       NUMERIC(12,2) NOT NULL,
  total_price      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS auto_parts_quote_items_quote_idx ON auto_parts_quote_items(quote_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE auto_parts_catalog            ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_parts_compatibility      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_parts_workspace_pricing  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_parts_quotes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_parts_quote_items        ENABLE ROW LEVEL SECURITY;

-- Catálogo global: leitura para autenticados (granular por nicho na migration 07)
CREATE POLICY "autenticados leem catalogo pecas"
  ON auto_parts_catalog FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "autenticados leem compatibilidade"
  ON auto_parts_compatibility FOR SELECT TO authenticated USING (true);

-- Pricing: workspace vê apenas seus próprios preços
CREATE POLICY "workspace ve propria precificacao"
  ON auto_parts_workspace_pricing FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia propria precificacao"
  ON auto_parts_workspace_pricing FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

-- Quotes: isolamento por workspace
CREATE POLICY "workspace ve proprios orcamentos"
  ON auto_parts_quotes FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia proprios orcamentos"
  ON auto_parts_quotes FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace ve itens de seus orcamentos"
  ON auto_parts_quote_items FOR SELECT TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM auto_parts_quotes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

CREATE POLICY "workspace gerencia itens de seus orcamentos"
  ON auto_parts_quote_items FOR ALL TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM auto_parts_quotes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM auto_parts_quotes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );
