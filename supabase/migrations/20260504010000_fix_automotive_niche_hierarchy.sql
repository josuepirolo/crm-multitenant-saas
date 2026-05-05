-- Corrige hierarquia: adiciona "automotive" como pai de auto-parts e auto-sales
-- auto-parts já existe no seed anterior — apenas adiciona o pai e cria auto-sales

-- 1. Insere nicho pai "Automotivo"
INSERT INTO business_niches (name, slug, description, sort_order)
VALUES ('Automotivo', 'automotive', 'Segmento automotivo — veículos, peças e acessórios', 3)
ON CONFLICT (slug) DO NOTHING;

-- 2. Atualiza auto-parts para ter automotive como pai
UPDATE business_niches
SET parent_id = (SELECT id FROM business_niches WHERE slug = 'automotive')
WHERE slug = 'auto-parts';

-- 3. Insere auto-sales como filho de automotive
INSERT INTO business_niches (parent_id, name, slug, description, sort_order)
SELECT id, 'Venda de Veículos', 'auto-sales', 'Concessionárias e lojas de veículos novos e usados', 20
FROM business_niches WHERE slug = 'automotive'
ON CONFLICT (slug) DO NOTHING;
