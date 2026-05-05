-- Catálogo global de veículos — gerenciado pelo superadmin
-- Serve como referência compartilhada entre auto-parts e auto-sales

-- ── Categorias de veículo ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO vehicle_categories (name, slug, sort_order) VALUES
  ('Automóvel',           'car',           10),
  ('Caminhão Leve',       'truck-light',   20),
  ('Caminhão Pesado',     'truck-heavy',   30),
  ('Ônibus',              'bus',           40),
  ('Motocicleta',         'motorcycle',    50),
  ('Moto Elétrica',       'e-motorcycle',  60),
  ('Bicicleta',           'bicycle',       70),
  ('Bicicleta Elétrica',  'e-bicycle',     80),
  ('Lancha / Barco',      'boat',          90),
  ('Trator / Agrícola',   'tractor',       100)
ON CONFLICT (slug) DO NOTHING;

-- ── Fabricantes / Marcas ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_brands (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_brands_slug_idx ON vehicle_brands(slug);

INSERT INTO vehicle_brands (name, slug, sort_order) VALUES
  -- Automóveis
  ('Toyota',          'toyota',         10),
  ('Honda',           'honda',          20),
  ('Volkswagen',      'volkswagen',     30),
  ('Chevrolet',       'chevrolet',      40),
  ('Hyundai',         'hyundai',        50),
  ('Fiat',            'fiat',           60),
  ('Ford',            'ford',           70),
  ('Renault',         'renault',        80),
  ('Jeep',            'jeep',           90),
  ('Nissan',          'nissan',         100),
  -- Caminhões / Pesados
  ('Mercedes-Benz',   'mercedes-benz',  110),
  ('Volvo',           'volvo',          120),
  ('Scania',          'scania',         130),
  ('MAN',             'man',            140),
  ('Iveco',           'iveco',          150),
  ('DAF',             'daf',            160),
  -- Motos
  ('Yamaha',          'yamaha',         170),
  ('Honda Motos',     'honda-motos',    180),
  ('Kawasaki',        'kawasaki',       190),
  ('Suzuki',          'suzuki',         200),
  ('BMW Motorrad',    'bmw-motorrad',   210),
  -- Bicicletas / E-bikes
  ('Cannondale',      'cannondale',     220),
  ('Trek',            'trek',           230),
  ('Caloi',           'caloi',          240),
  ('Specialized',     'specialized',    250),
  -- Lanchas / Náutico
  ('Yamarin',         'yamarin',        260),
  ('Focker',          'focker',         270),
  -- Agrícola
  ('John Deere',      'john-deere',     280),
  ('Massey Ferguson', 'massey-ferguson',290),
  ('New Holland',     'new-holland',    300)
ON CONFLICT (slug) DO NOTHING;

-- ── Modelos de veículo ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_models (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     UUID NOT NULL REFERENCES vehicle_brands(id) ON DELETE RESTRICT,
  category_id  UUID NOT NULL REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  year_from    SMALLINT,
  year_to      SMALLINT,  -- NULL = produção atual
  engine_cc    INTEGER,   -- cilindradas (motos, agrícola)
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_models_brand_idx    ON vehicle_models(brand_id);
CREATE INDEX IF NOT EXISTS vehicle_models_category_idx ON vehicle_models(category_id);
CREATE INDEX IF NOT EXISTS vehicle_models_slug_idx     ON vehicle_models(slug);

-- Seeds: modelos mais comuns por categoria
INSERT INTO vehicle_models (brand_id, category_id, name, slug, year_from, year_to) VALUES
  -- Toyota
  ((SELECT id FROM vehicle_brands WHERE slug='toyota'), (SELECT id FROM vehicle_categories WHERE slug='car'), 'Corolla',           'toyota-corolla',          1992, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='toyota'), (SELECT id FROM vehicle_categories WHERE slug='car'), 'Corolla Cross',     'toyota-corolla-cross',    2021, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='toyota'), (SELECT id FROM vehicle_categories WHERE slug='car'), 'Hilux',             'toyota-hilux',            1969, NULL),
  -- Volkswagen
  ((SELECT id FROM vehicle_brands WHERE slug='volkswagen'), (SELECT id FROM vehicle_categories WHERE slug='car'), 'Gol',           'vw-gol',                  1980, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='volkswagen'), (SELECT id FROM vehicle_categories WHERE slug='car'), 'Polo',          'vw-polo',                 2002, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='volkswagen'), (SELECT id FROM vehicle_categories WHERE slug='car'), 'T-Cross',       'vw-t-cross',              2019, NULL),
  -- Mercedes-Benz Caminhões
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-light'), '710',    'mb-710',  1991, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-light'), '915',    'mb-915',  2000, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), '1113',   'mb-1113', 1970, 1993),
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), '1313',   'mb-1313', 1975, 1995),
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), '2318',   'mb-2318', 1995, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'Axor',   'mb-axor', 2002, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='mercedes-benz'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'Actros', 'mb-actros',2003, NULL),
  -- Volvo Caminhões
  ((SELECT id FROM vehicle_brands WHERE slug='volvo'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'FH 460',  'volvo-fh460',  2002, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='volvo'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'FH 540',  'volvo-fh540',  2012, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='volvo'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'VM 330',  'volvo-vm330',  2005, NULL),
  -- Scania
  ((SELECT id FROM vehicle_brands WHERE slug='scania'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'R 450',   'scania-r450',  2016, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='scania'), (SELECT id FROM vehicle_categories WHERE slug='truck-heavy'), 'R 500',   'scania-r500',  2016, NULL),
  -- Yamaha Motos
  ((SELECT id FROM vehicle_brands WHERE slug='yamaha'), (SELECT id FROM vehicle_categories WHERE slug='motorcycle'), 'MT-07',   'yamaha-mt07',  2014, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='yamaha'), (SELECT id FROM vehicle_categories WHERE slug='motorcycle'), 'Lander',  'yamaha-lander',2006, NULL),
  ((SELECT id FROM vehicle_brands WHERE slug='yamaha'), (SELECT id FROM vehicle_categories WHERE slug='motorcycle'), 'Factor',  'yamaha-factor',2008, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_brands     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models     ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler categorias e marcas (usadas em formulários de qualquer nicho)
CREATE POLICY "autenticados leem categorias"
  ON vehicle_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados leem marcas"
  ON vehicle_brands FOR SELECT TO authenticated USING (true);

-- Modelos: apenas workspaces em nichos automotivos
-- (policy completa criada na migration 07 após função auxiliar)
CREATE POLICY "autenticados leem modelos"
  ON vehicle_models FOR SELECT TO authenticated USING (true);
-- Nota: policy granular por nicho aplicada na migration 20260504_07
