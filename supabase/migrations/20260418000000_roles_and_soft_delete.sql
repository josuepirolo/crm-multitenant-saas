-- =============================================
-- Novos roles + soft delete em entidades principais
-- =============================================

-- Expande o enum member_role com os novos perfis CRM
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'support';

-- =============================================
-- SOFT DELETE — nunca deletamos, apenas desativamos
-- =============================================

ALTER TABLE contacts        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE deals           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE conversations   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE messages        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE pipelines       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE stages          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tags            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Indexes para queries de deleted_at
CREATE INDEX IF NOT EXISTS idx_contacts_deleted        ON contacts(deleted_at)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_deleted           ON deals(deleted_at)           WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_deleted   ON conversations(deleted_at)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pipelines_deleted       ON pipelines(deleted_at)       WHERE deleted_at IS NULL;

-- =============================================
-- FUNÇÕES HELPER para verificar roles
-- =============================================

-- Retorna o role do usuário autenticado em um workspace
CREATE OR REPLACE FUNCTION my_role_in_workspace(p_workspace_id UUID)
RETURNS member_role AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Verifica se o usuário é owner ou admin em um workspace
CREATE OR REPLACE FUNCTION is_admin_in_workspace(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Atualiza my_workspace_ids para ignorar membros desativados
CREATE OR REPLACE FUNCTION my_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND deleted_at IS NULL
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================
-- ATUALIZA RLS — filtra soft deleted + granular por role
-- =============================================

-- contacts: sales/support só veem ativos; manager/admin/owner veem tudo
DROP POLICY IF EXISTS "acesso total a contatos do workspace" ON contacts;

CREATE POLICY "ver contatos ativos do workspace" ON contacts
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "criar contatos" ON contacts
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT my_workspace_ids())
  );

CREATE POLICY "editar contatos" ON contacts
  FOR UPDATE USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

-- Soft delete: update apenas (nunca DELETE real)
CREATE POLICY "soft delete contatos" ON contacts
  FOR UPDATE USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND is_admin_in_workspace(workspace_id) = true
  );

-- deals
DROP POLICY IF EXISTS "acesso total a deals do workspace" ON deals;

CREATE POLICY "ver deals ativos do workspace" ON deals
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "criar deals" ON deals
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "editar deals" ON deals
  FOR UPDATE USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

-- pipelines
DROP POLICY IF EXISTS "acesso total a pipelines do workspace" ON pipelines;

CREATE POLICY "ver pipelines ativos" ON pipelines
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "gerenciar pipelines" ON pipelines
  FOR ALL USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND is_admin_in_workspace(workspace_id) = true
  );

-- stages
DROP POLICY IF EXISTS "acesso total a stages do workspace" ON stages;

CREATE POLICY "ver stages de pipelines ativos" ON stages
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "gerenciar stages" ON stages
  FOR ALL USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND is_admin_in_workspace(workspace_id) = true
  );

-- conversations
DROP POLICY IF EXISTS "acesso a conversas do workspace" ON conversations;

CREATE POLICY "ver conversas ativas" ON conversations
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "criar e editar conversas" ON conversations
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- messages: nunca são deletadas (audit log)
-- workspace_members
DROP POLICY IF EXISTS "owner/admin pode gerenciar membros" ON workspace_members;

CREATE POLICY "admin pode gerenciar membros" ON workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );
