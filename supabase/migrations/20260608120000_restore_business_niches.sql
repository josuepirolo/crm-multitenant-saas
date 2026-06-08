-- ── Restaura tabela business_niches removida indevidamente fora do framework de migrations ──
-- A tabela existia (migrations 20260427/20260502/20260504010000/20260504070000 a populavam
-- e referenciavam com sucesso) mas foi dropada via SQL ad-hoc, sem registro em
-- supabase_migrations.schema_migrations. Resultado: getActiveWorkspaceContext() e outras
-- queries fazem embed `business_niches(slug)` que o PostgREST não resolve (PGRST200),
-- derrubando o login de TODOS os usuários (workspaces: [] → redirect /no-workspace).
--
-- Esta migration recria a tabela com o schema original, restaura a FK em workspaces,
-- RLS, e repopula o catálogo (seed original + hierarquia auto-parts/automotive das
-- migrations 20260502 e 20260504010000, necessárias para as policies de
-- niche_rls_catalog_access continuarem funcionando).

CREATE TABLE IF NOT EXISTS business_niches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES business_niches(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_niches_parent_idx ON business_niches(parent_id);
CREATE INDEX IF NOT EXISTS business_niches_active_idx ON business_niches(is_active) WHERE is_active = TRUE;

CREATE TRIGGER trg_business_niches_updated_at
  BEFORE UPDATE ON business_niches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE business_niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem nichos ativos"
  ON business_niches FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- ── Limpa referência órfã antes de restaurar a FK ────────────────────────────
-- O workspace "PyTec" aponta para um business_niche_id que não existe mais
-- (a tabela estava vazia/inexistente). Não há trilha de auditoria do nicho
-- original — zera para o usuário re-selecionar via Settings.
UPDATE workspaces
SET business_niche_id = NULL
WHERE business_niche_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM business_niches WHERE id = workspaces.business_niche_id);

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_business_niche_id_fkey
  FOREIGN KEY (business_niche_id) REFERENCES business_niches(id) ON DELETE SET NULL;

-- ── Seed: nichos iniciais (migration 20260427_business_niches) ───────────────

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

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Moda Evangélica',  'moda-evangelica',  'Moda feminina com estilo evangélico', 10
FROM business_niches WHERE slug = 'moda-feminina'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Clínica Médica',   'clinica-medica',   'Consultas e atendimento médico',   10 FROM business_niches WHERE slug = 'saude'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Odontologia',      'odontologia',      'Clínicas e consultórios odontológicos', 20 FROM business_niches WHERE slug = 'saude'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Farmácia',         'farmacia',         'Farmácias e drogarias',            30 FROM business_niches WHERE slug = 'saude'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Imobiliária',      'imobiliaria',      'Compra e venda de imóveis',        10 FROM business_niches WHERE slug = 'imobiliario'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Incorporadora',    'incorporadora',    'Desenvolvimento imobiliário',       20 FROM business_niches WHERE slug = 'imobiliario'
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: nicho Auto Peças (migration 20260502_seed_auto_parts_niche) ────────

INSERT INTO business_niches (name, slug, description, sort_order) VALUES
  ('Auto Peças', 'auto-parts', 'Peças automotivas e acessórios para veículos', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Linha Pesada', 'auto-parts-heavy', 'Caminhões, ônibus e veículos pesados', 10
FROM business_niches WHERE slug = 'auto-parts'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Linha Leve', 'auto-parts-light', 'Automóveis e utilitários leves', 20
FROM business_niches WHERE slug = 'auto-parts'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Agrícola', 'auto-parts-agro', 'Tratores, colheitadeiras e máquinas agrícolas', 30
FROM business_niches WHERE slug = 'auto-parts'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Motocicletas', 'auto-parts-moto', 'Peças e acessórios para motos', 40
FROM business_niches WHERE slug = 'auto-parts'
ON CONFLICT (slug) DO NOTHING;

-- ── Hierarquia automotiva (migration 20260504010000_fix_automotive_niche_hierarchy) ──

INSERT INTO business_niches (name, slug, description, sort_order)
VALUES ('Automotivo', 'automotive', 'Segmento automotivo — veículos, peças e acessórios', 3)
ON CONFLICT (slug) DO NOTHING;

UPDATE business_niches
SET parent_id = (SELECT id FROM business_niches WHERE slug = 'automotive')
WHERE slug = 'auto-parts';

INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Venda de Veículos', 'auto-sales', 'Concessionárias e lojas de veículos novos e usados', 20
FROM business_niches WHERE slug = 'automotive'
ON CONFLICT (slug) DO NOTHING;

-- ── Recarrega o schema cache do PostgREST para reconhecer a relação restaurada ──
NOTIFY pgrst, 'reload schema';
