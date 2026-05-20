-- Tabela de integrações por workspace.
-- Dono da relação negocial: o admin do workspace ativa/desativa integrações.
-- A ponte entre o CRM e o backend WhatsApp é feita via wa_tenant_id.

CREATE TABLE IF NOT EXISTS workspace_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,           -- 'whatsapp', 'email', 'instagram'...
  provider_id      TEXT,                    -- 'zapi', 'evolution', 'meta_official'...
  wa_tenant_id     UUID,                    -- FK lógica para wa_tenants (backend WA)
  status           TEXT NOT NULL DEFAULT 'pending', -- 'active', 'inactive', 'pending'
  settings         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_workspace
  ON workspace_integrations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_wa_tenant
  ON workspace_integrations(wa_tenant_id) WHERE wa_tenant_id IS NOT NULL;

ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros leem integrações do workspace"
  ON workspace_integrations FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

CREATE POLICY "admins gerenciam integrações do workspace"
  ON workspace_integrations FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND deleted_at IS NULL
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND deleted_at IS NULL
  ));
