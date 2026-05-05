-- Seed: nicho Auto Peças e seus segmentos
-- Usa parent_id para replicar a hierarquia niche → segment já existente no modelo

INSERT INTO business_niches (name, slug, description, sort_order) VALUES
  ('Auto Peças', 'auto-parts', 'Peças automotivas e acessórios para veículos', 5)
ON CONFLICT (slug) DO NOTHING;

-- Segmentos de Auto Peças
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
