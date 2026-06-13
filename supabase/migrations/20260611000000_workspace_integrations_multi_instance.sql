-- Permite múltiplos vínculos WA por workspace (1 workspace : N wa_tenant_id).
-- Antes: UNIQUE (workspace_id, integration_type, provider_id) limitava a
-- 1 instância por (workspace, tipo, provider) — bloqueando, por exemplo,
-- "Vendas" e "Suporte" ambos via Z-API no mesmo workspace.
ALTER TABLE workspace_integrations
  DROP CONSTRAINT workspace_integrations_workspace_id_integration_type_provid_key;

-- Nome amigável por instância vinculada (ex.: "Vendas SP", "Suporte").
ALTER TABLE workspace_integrations
  ADD COLUMN label TEXT;

-- Garante 1 wa_tenant_id : no máximo 1 workspace (isolamento multi-tenant).
-- Postgres trata múltiplos NULL como distintos, então linhas "pending"
-- sem wa_tenant_id continuam permitidas em qualquer quantidade.
ALTER TABLE workspace_integrations
  ADD CONSTRAINT workspace_integrations_wa_tenant_id_unique UNIQUE (wa_tenant_id);
