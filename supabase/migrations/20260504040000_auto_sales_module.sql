-- Módulo Auto Sales — concessionárias e lojas de veículos
-- Estoque físico por workspace + precificação + opcionais + propostas de venda

-- ── Estoque de veículos (por workspace) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_sales_inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  model_id            UUID NOT NULL REFERENCES vehicle_models(id) ON DELETE RESTRICT,
  -- instância física
  plate               TEXT,         -- nullable: 0km, bicicleta, lancha
  color               TEXT NOT NULL,
  year_manufacture    SMALLINT NOT NULL,
  year_model          SMALLINT NOT NULL,
  trim                TEXT,         -- "XRE", "LTZ", "Sport", "Premium"
  mileage_km          INTEGER NOT NULL DEFAULT 0,
  fuel                TEXT,         -- "Gasolina", "Flex", "Diesel", "Híbrido", "Elétrico"
  transmission        TEXT,         -- "Manual", "Automático", "CVT"
  chassis             TEXT,
  renavam             TEXT,         -- náutico e veículos sem placa convencional
  condition           TEXT NOT NULL DEFAULT 'used'
                      CHECK (condition IN ('new','used','certified')),
  -- flags comerciais
  has_sinistro        BOOLEAN NOT NULL DEFAULT FALSE,
  has_cautelar_issue  BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_trade_in    BOOLEAN NOT NULL DEFAULT TRUE,
  requires_down_pay   BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_financing   BOOLEAN NOT NULL DEFAULT TRUE,
  status              TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','reserved','sold','inactive')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auto_sales_inv_ws_idx       ON auto_sales_inventory(workspace_id);
CREATE INDEX IF NOT EXISTS auto_sales_inv_model_idx    ON auto_sales_inventory(model_id);
CREATE INDEX IF NOT EXISTS auto_sales_inv_status_idx   ON auto_sales_inventory(workspace_id, status);
CREATE INDEX IF NOT EXISTS auto_sales_inv_color_idx    ON auto_sales_inventory(workspace_id, color);
CREATE INDEX IF NOT EXISTS auto_sales_inv_year_idx     ON auto_sales_inventory(workspace_id, year_model);

CREATE TRIGGER trg_auto_sales_inventory_updated_at
  BEFORE UPDATE ON auto_sales_inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Precificação do veículo ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_sales_inventory_pricing (
  inventory_id       UUID PRIMARY KEY REFERENCES auto_sales_inventory(id) ON DELETE CASCADE,
  cost_price         NUMERIC(14,2) NOT NULL DEFAULT 0,  -- NF da montadora / leilão
  offer_price        NUMERIC(14,2) NOT NULL DEFAULT 0,  -- preço anunciado
  max_discount_price NUMERIC(14,2),                     -- mínimo aceitável na negociação
  markup_pct         NUMERIC(8,2)  GENERATED ALWAYS AS (
    ROUND((offer_price - cost_price) / NULLIF(cost_price, 0) * 100, 2)
  ) STORED,
  margin_pct         NUMERIC(8,2)  GENERATED ALWAYS AS (
    ROUND((offer_price - cost_price) / NULLIF(offer_price, 0) * 100, 2)
  ) STORED,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_auto_sales_pricing_updated_at
  BEFORE UPDATE ON auto_sales_inventory_pricing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Itens opcionais / acessórios do veículo ───────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_sales_optional_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES auto_sales_inventory(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,     -- "Teto Solar Panorâmico", "Multimídia 12\""
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_included  BOOLEAN NOT NULL DEFAULT FALSE  -- incluso no preço ou opcional pago
);

CREATE INDEX IF NOT EXISTS auto_sales_optionals_inv_idx ON auto_sales_optional_items(inventory_id);

-- ── Propostas de venda ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_sales_proposals (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id               UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id                  UUID,  -- FK para deals quando módulo estiver pronto
  inventory_id             UUID REFERENCES auto_sales_inventory(id) ON DELETE SET NULL,
  -- trade-in (veículo que o cliente oferece como entrada)
  trade_in_plate           TEXT,
  trade_in_model_id        UUID REFERENCES vehicle_models(id) ON DELETE SET NULL,
  trade_in_year            SMALLINT,
  trade_in_mileage_km      INTEGER,
  trade_in_estimated_value NUMERIC(14,2),
  -- negociação
  final_price              NUMERIC(14,2),
  down_payment             NUMERIC(14,2),
  financing_months         SMALLINT,
  financing_institution    TEXT,
  status                   TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  notes                    TEXT,
  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auto_sales_proposals_ws_idx      ON auto_sales_proposals(workspace_id);
CREATE INDEX IF NOT EXISTS auto_sales_proposals_contact_idx ON auto_sales_proposals(contact_id);
CREATE INDEX IF NOT EXISTS auto_sales_proposals_status_idx  ON auto_sales_proposals(workspace_id, status);

CREATE TRIGGER trg_auto_sales_proposals_updated_at
  BEFORE UPDATE ON auto_sales_proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE auto_sales_inventory         ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_sales_inventory_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_sales_optional_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_sales_proposals         ENABLE ROW LEVEL SECURITY;

-- Inventory: isolamento por workspace
CREATE POLICY "workspace ve proprio estoque"
  ON auto_sales_inventory FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia proprio estoque"
  ON auto_sales_inventory FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

-- Pricing: via inventory
CREATE POLICY "workspace ve precificacao do estoque"
  ON auto_sales_inventory_pricing FOR SELECT TO authenticated
  USING (
    inventory_id IN (
      SELECT id FROM auto_sales_inventory WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

CREATE POLICY "workspace gerencia precificacao do estoque"
  ON auto_sales_inventory_pricing FOR ALL TO authenticated
  USING (
    inventory_id IN (
      SELECT id FROM auto_sales_inventory WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    inventory_id IN (
      SELECT id FROM auto_sales_inventory WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- Opcionais: via inventory
CREATE POLICY "workspace ve opcionais do estoque"
  ON auto_sales_optional_items FOR SELECT TO authenticated
  USING (
    inventory_id IN (
      SELECT id FROM auto_sales_inventory WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

CREATE POLICY "workspace gerencia opcionais do estoque"
  ON auto_sales_optional_items FOR ALL TO authenticated
  USING (
    inventory_id IN (
      SELECT id FROM auto_sales_inventory WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    inventory_id IN (
      SELECT id FROM auto_sales_inventory WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- Proposals: isolamento por workspace
CREATE POLICY "workspace ve proprias propostas"
  ON auto_sales_proposals FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia proprias propostas"
  ON auto_sales_proposals FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
