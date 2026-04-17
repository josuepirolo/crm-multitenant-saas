-- =============================================
-- CRM Vendas WhatsApp — Schema Supabase
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE member_role       AS ENUM ('owner', 'admin', 'member');
CREATE TYPE contact_status    AS ENUM ('lead', 'prospect', 'customer', 'churned');
CREATE TYPE deal_status       AS ENUM ('open', 'won', 'lost', 'archived');
CREATE TYPE activity_type     AS ENUM ('note', 'call', 'email', 'whatsapp', 'meeting', 'task');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status    AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE conv_status       AS ENUM ('open', 'pending', 'resolved', 'archived');

-- =============================================
-- FUNÇÃO updated_at (trigger reutilizável)
-- =============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TABELAS
-- =============================================

-- Workspaces (tenants)
CREATE TABLE workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  logo_url   TEXT,
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (espelha auth.users)
CREATE TABLE profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT,
  avatar_url           TEXT,
  current_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membros de cada workspace
CREATE TABLE workspace_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         member_role NOT NULL DEFAULT 'member',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- Contatos
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  company       TEXT,
  status        contact_status NOT NULL DEFAULT 'lead',
  avatar_url    TEXT,
  notes         TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

-- Relação contato ↔ tag
CREATE TABLE contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- Funis de venda
CREATE TABLE pipelines (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Etapas do kanban
CREATE TABLE stages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pipeline_id  UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Negociações (cards do kanban)
CREATE TABLE deals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pipeline_id         UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id            UUID NOT NULL REFERENCES stages(id) ON DELETE RESTRICT,
  contact_id          UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  value               DECIMAL(12,2),
  status              deal_status NOT NULL DEFAULT 'open',
  expected_close_date DATE,
  position            INTEGER NOT NULL DEFAULT 0,
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atividades de um deal (histórico)
CREATE TABLE deal_activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id      UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type         activity_type NOT NULL,
  content      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversas WhatsApp
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  phone           TEXT NOT NULL,
  status          conv_status NOT NULL DEFAULT 'open',
  assigned_to     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensagens
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction           message_direction NOT NULL,
  content             TEXT NOT NULL,
  status              message_status NOT NULL DEFAULT 'sent',
  whatsapp_message_id TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  sent_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TRIGGERS updated_at
-- =============================================

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stages_updated_at
  BEFORE UPDATE ON stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- TRIGGER: criar profile automaticamente ao registrar
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_workspace_members_user       ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace  ON workspace_members(workspace_id);
CREATE INDEX idx_contacts_workspace           ON contacts(workspace_id);
CREATE INDEX idx_contacts_phone               ON contacts(phone);
CREATE INDEX idx_tags_workspace               ON tags(workspace_id);
CREATE INDEX idx_pipelines_workspace          ON pipelines(workspace_id);
CREATE INDEX idx_stages_pipeline              ON stages(pipeline_id);
CREATE INDEX idx_deals_workspace              ON deals(workspace_id);
CREATE INDEX idx_deals_stage                  ON deals(stage_id);
CREATE INDEX idx_deals_contact                ON deals(contact_id);
CREATE INDEX idx_deals_assigned               ON deals(assigned_to);
CREATE INDEX idx_deal_activities_deal         ON deal_activities(deal_id);
CREATE INDEX idx_conversations_workspace      ON conversations(workspace_id);
CREATE INDEX idx_conversations_contact        ON conversations(contact_id);
CREATE INDEX idx_conversations_last_message   ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation        ON messages(conversation_id);
CREATE INDEX idx_messages_created_at          ON messages(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;

-- Função helper: workspaces do usuário autenticado
CREATE OR REPLACE FUNCTION my_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- workspaces
CREATE POLICY "ver workspaces que sou membro" ON workspaces
  FOR SELECT USING (id IN (SELECT my_workspace_ids()));

CREATE POLICY "owner pode atualizar workspace" ON workspaces
  FOR UPDATE USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- profiles
CREATE POLICY "ver proprio perfil" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "atualizar proprio perfil" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- workspace_members
CREATE POLICY "ver membros do meu workspace" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "owner/admin pode gerenciar membros" ON workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- contacts
CREATE POLICY "acesso total a contatos do workspace" ON contacts
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- tags
CREATE POLICY "acesso total a tags do workspace" ON tags
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- contact_tags
CREATE POLICY "acesso a contact_tags do workspace" ON contact_tags
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE workspace_id IN (SELECT my_workspace_ids()))
  );

-- pipelines
CREATE POLICY "acesso total a pipelines do workspace" ON pipelines
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- stages
CREATE POLICY "acesso total a stages do workspace" ON stages
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- deals
CREATE POLICY "acesso total a deals do workspace" ON deals
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- deal_activities
CREATE POLICY "acesso a atividades do workspace" ON deal_activities
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- conversations
CREATE POLICY "acesso a conversas do workspace" ON conversations
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));

-- messages
CREATE POLICY "acesso a mensagens do workspace" ON messages
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()));
