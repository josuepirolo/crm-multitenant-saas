-- ── Nichos de negócio hierárquicos ───────────────────────────────────────────
-- Tabela global gerenciada pelo superadmin.
-- Suporta hierarquia ilimitada via parent_id (adjacency list).
-- workspace.business_niche_id aponta para o nicho mais específico escolhido.
-- nicho NÃO concede nem restringe permissões — apenas classifica o workspace.

CREATE TABLE IF NOT EXISTS business_niches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES business_niches(id) ON DELETE RESTRICT, -- RESTRICT: impede excluir pai com filhos
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS business_niches_parent_idx ON business_niches(parent_id);
CREATE INDEX IF NOT EXISTS business_niches_active_idx ON business_niches(is_active) WHERE is_active = TRUE;

-- Trigger de updated_at
CREATE TRIGGER trg_business_niches_updated_at
  BEFORE UPDATE ON business_niches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FK em workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS business_niche_id UUID REFERENCES business_niches(id) ON DELETE SET NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE business_niches ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler nichos ativos (necessário para onboarding e seleção)
CREATE POLICY "autenticados leem nichos ativos"
  ON business_niches FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Superadmin lê todos (inclusive inativos) — via service_role que bypassa RLS
-- As actions de admin usam createAdminClient(), não precisam de policy adicional.

-- ── Seed: nichos iniciais ─────────────────────────────────────────────────────

INSERT INTO business_niches (name, slug, description, sort_order) VALUES
  ('Moda e Vestuário',    'moda',         'Roupas, calçados e acessórios',              10),
  ('Saúde e Bem-estar',   'saude',        'Clínicas, consultórios e produtos de saúde', 20),
  ('Educação',            'educacao',     'Cursos, escolas e treinamentos',             30),
  ('Imobiliário',         'imobiliario',  'Imóveis, aluguel e incorporadoras',          40),
  ('Alimentação',         'alimentacao',  'Restaurantes, delivery e alimentos',         50),
  ('Tecnologia',          'tecnologia',   'Software, hardware e serviços digitais',     60),
  ('Beleza e Estética',   'beleza',       'Salões, clínicas estéticas e cosméticos',   70),
  ('Serviços Gerais',     'servicos',     'Prestação de serviços diversificados',       80),
  ('Varejo',              'varejo',       'Comércio e lojas em geral',                  90),
  ('Financeiro',          'financeiro',   'Contabilidade, finanças e investimentos',   100)
ON CONFLICT (slug) DO NOTHING;

-- Subnichos de Moda
INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Moda Feminina',    'moda-feminina',    'Roupas e acessórios femininos',    10 FROM business_niches WHERE slug = 'moda'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Moda Masculina',   'moda-masculina',   'Roupas e acessórios masculinos',   20 FROM business_niches WHERE slug = 'moda'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Moda Infantil',    'moda-infantil',    'Roupas e acessórios infantis',     30 FROM business_niches WHERE slug = 'moda'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Calçados',         'calcados',         'Sapatos, tênis e sandálias',       40 FROM business_niches WHERE slug = 'moda'
ON CONFLICT (slug) DO NOTHING;

-- Sub-subnicho: Moda Feminina > Moda Evangélica
INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Moda Evangélica',  'moda-evangelica',  'Moda feminina com estilo evangélico', 10
FROM business_niches WHERE slug = 'moda-feminina'
ON CONFLICT (slug) DO NOTHING;

-- Subnichos de Saúde
INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Clínica Médica',   'clinica-medica',   'Consultas e atendimento médico',   10 FROM business_niches WHERE slug = 'saude'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Odontologia',      'odontologia',      'Clínicas e consultórios odontológicos', 20 FROM business_niches WHERE slug = 'saude'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Farmácia',         'farmacia',         'Farmácias e drogarias',            30 FROM business_niches WHERE slug = 'saude'
ON CONFLICT (slug) DO NOTHING;

-- Subnichos de Imobiliário
INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Imobiliária',      'imobiliaria',      'Compra e venda de imóveis',        10 FROM business_niches WHERE slug = 'imobiliario'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Incorporadora',    'incorporadora',    'Desenvolvimento imobiliário',       20 FROM business_niches WHERE slug = 'imobiliario'
ON CONFLICT (slug) DO NOTHING;
