-- RLS granular por nicho para catálogos globais
-- Restringe acesso ao catálogo de veículos e peças conforme o nicho do workspace

-- ── Função auxiliar: slug do nicho do workspace atual ────────────────────────
-- Retorna o slug do nicho mais específico do workspace corrente do usuário.
-- STABLE: resultado cacheado por transação — zero custo em queries com muitas linhas.

CREATE OR REPLACE FUNCTION current_workspace_niche_slug()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.slug
  FROM profiles p
  JOIN workspaces w ON w.id = p.current_workspace_id
  JOIN business_niches n ON n.id = w.business_niche_id
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

-- ── Função auxiliar: verifica se o nicho atual é filho de um pai ──────────────
-- Navega a hierarquia de business_niches para verificar ancestralidade.

CREATE OR REPLACE FUNCTION niche_is_under(parent_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE niche_tree AS (
    -- nó inicial: nicho do workspace atual
    SELECT n.id, n.parent_id, n.slug
    FROM profiles p
    JOIN workspaces w ON w.id = p.current_workspace_id
    JOIN business_niches n ON n.id = w.business_niche_id
    WHERE p.id = auth.uid()

    UNION ALL

    -- sobe na hierarquia via parent_id
    SELECT bn.id, bn.parent_id, bn.slug
    FROM business_niches bn
    JOIN niche_tree nt ON bn.id = nt.parent_id
  )
  SELECT EXISTS (
    SELECT 1 FROM niche_tree WHERE slug = parent_slug
  )
$$;

-- ── Atualiza policies de vehicle_models (substitui policy permissiva da migration 02) ──

DROP POLICY IF EXISTS "autenticados leem modelos" ON vehicle_models;

CREATE POLICY "nichos automotivos leem modelos de veiculos"
  ON vehicle_models FOR SELECT TO authenticated
  USING (
    niche_is_under('automotive')
    OR current_workspace_niche_slug() LIKE 'auto%'
  );

-- ── Restringe vehicle_brands para nichos automotivos ─────────────────────────

DROP POLICY IF EXISTS "autenticados leem marcas" ON vehicle_brands;

CREATE POLICY "nichos automotivos leem marcas de veiculos"
  ON vehicle_brands FOR SELECT TO authenticated
  USING (
    niche_is_under('automotive')
    OR current_workspace_niche_slug() LIKE 'auto%'
  );

-- vehicle_categories: mantém aberto para todos (usado em formulários gerais)
-- Não contém dados sensíveis — apenas nomes como "carro", "moto"

-- ── Restringe auto_parts_catalog para nicho auto-parts ───────────────────────

DROP POLICY IF EXISTS "autenticados leem catalogo pecas" ON auto_parts_catalog;

CREATE POLICY "nicho auto-parts le catalogo de pecas"
  ON auto_parts_catalog FOR SELECT TO authenticated
  USING (
    is_active = TRUE
    AND (
      niche_is_under('auto-parts')
      OR current_workspace_niche_slug() = 'auto-parts'
    )
  );

DROP POLICY IF EXISTS "autenticados leem compatibilidade" ON auto_parts_compatibility;

CREATE POLICY "nicho auto-parts le compatibilidade"
  ON auto_parts_compatibility FOR SELECT TO authenticated
  USING (
    niche_is_under('auto-parts')
    OR current_workspace_niche_slug() = 'auto-parts'
  );

-- ── Superadmin: escrita nos catálogos globais via service_role ────────────────
-- vehicle_brands, vehicle_models, auto_parts_catalog são gerenciados pelo superadmin
-- usando createAdminClient() que bypassa RLS — nenhuma policy adicional necessária.

-- ── Comentário de arquitetura ─────────────────────────────────────────────────
-- fashion_products já é por workspace (isolamento via workspace_id + my_workspace_ids())
-- auto_sales_inventory já é por workspace — sem restrição adicional por nicho necessária
-- A sidebar/UI reforça a restrição de nicho na camada de apresentação
