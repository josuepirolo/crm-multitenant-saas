-- Módulo Fashion — lojas de moda e vestuário
-- Catálogo por workspace + variantes (cor + tamanho) + precificação + estoque

-- ── Produtos base (por workspace) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fashion_products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL,  -- "Vestidos", "Blusas", "Calças", "Sapatos"
  gender       TEXT NOT NULL DEFAULT 'feminino'
               CHECK (gender IN ('feminino','masculino','infantil','unissex')),
  brand        TEXT,           -- marca própria ou de terceiro
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fashion_products_ws_idx       ON fashion_products(workspace_id);
CREATE INDEX IF NOT EXISTS fashion_products_category_idx ON fashion_products(workspace_id, category);
CREATE INDEX IF NOT EXISTS fashion_products_active_idx   ON fashion_products(workspace_id, is_active) WHERE is_active = TRUE;

CREATE TRIGGER trg_fashion_products_updated_at
  BEFORE UPDATE ON fashion_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Variantes: cada combinação cor + tamanho = 1 SKU ─────────────────────────

CREATE TABLE IF NOT EXISTS fashion_product_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES fashion_products(id) ON DELETE CASCADE,
  color      TEXT NOT NULL,   -- "Azul Marinho", "Rosê", "Vermelho Marsala"
  size       TEXT NOT NULL,   -- "PP", "P", "M", "G", "GG", "36", "38"...
  sku        TEXT NOT NULL,   -- "GAB-AZM-M"
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (product_id, color, size),
  UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS fashion_variants_product_idx ON fashion_product_variants(product_id);
CREATE INDEX IF NOT EXISTS fashion_variants_color_idx   ON fashion_product_variants(product_id, color);
CREATE INDEX IF NOT EXISTS fashion_variants_size_idx    ON fashion_product_variants(product_id, size);

-- ── Precificação por variante e workspace ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS fashion_variant_pricing (
  variant_id   UUID NOT NULL REFERENCES fashion_product_variants(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cost_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  markup_pct   NUMERIC(8,2)  GENERATED ALWAYS AS (
    ROUND((sale_price - cost_price) / NULLIF(cost_price, 0) * 100, 2)
  ) STORED,
  margin_pct   NUMERIC(8,2)  GENERATED ALWAYS AS (
    ROUND((sale_price - cost_price) / NULLIF(sale_price, 0) * 100, 2)
  ) STORED,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (variant_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS fashion_pricing_ws_idx ON fashion_variant_pricing(workspace_id);

CREATE TRIGGER trg_fashion_pricing_updated_at
  BEFORE UPDATE ON fashion_variant_pricing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Estoque por variante e workspace ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fashion_variant_stock (
  variant_id   UUID NOT NULL REFERENCES fashion_product_variants(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock    INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (variant_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS fashion_stock_ws_idx  ON fashion_variant_stock(workspace_id);
CREATE INDEX IF NOT EXISTS fashion_stock_low_idx ON fashion_variant_stock(workspace_id, quantity)
  WHERE quantity <= min_stock;  -- índice parcial para alertas de estoque baixo

CREATE TRIGGER trg_fashion_stock_updated_at
  BEFORE UPDATE ON fashion_variant_stock
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fashion_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fashion_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fashion_variant_pricing  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fashion_variant_stock    ENABLE ROW LEVEL SECURITY;

-- Produtos: isolamento por workspace
CREATE POLICY "workspace ve proprios produtos fashion"
  ON fashion_products FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia proprios produtos fashion"
  ON fashion_products FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

-- Variantes: via produto do workspace
CREATE POLICY "workspace ve variantes de seus produtos"
  ON fashion_product_variants FOR SELECT TO authenticated
  USING (
    product_id IN (
      SELECT id FROM fashion_products WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

CREATE POLICY "workspace gerencia variantes de seus produtos"
  ON fashion_product_variants FOR ALL TO authenticated
  USING (
    product_id IN (
      SELECT id FROM fashion_products WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM fashion_products WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- Pricing e stock: isolamento por workspace_id direto
CREATE POLICY "workspace ve propria precificacao fashion"
  ON fashion_variant_pricing FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia propria precificacao fashion"
  ON fashion_variant_pricing FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace ve proprio estoque fashion"
  ON fashion_variant_stock FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "workspace gerencia proprio estoque fashion"
  ON fashion_variant_stock FOR ALL TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
