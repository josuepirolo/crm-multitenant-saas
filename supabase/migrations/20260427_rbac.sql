-- ============================================================
-- RBAC granular por workspace
-- Compatível com modelo atual: workspace_members.role (enum)
-- permanece intacto; workspace_role_id é opcional e nullable.
-- Quando definido, permissões vêm do banco; quando null,
-- permissões derivam da matriz hardcoded em permissions.ts.
-- ============================================================

-- ── 1. Catálogo global de permissões ───────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE, -- formato: "module:action", ex: "contacts:view"
  description TEXT NOT NULL,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Roles por workspace ─────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_system    BOOLEAN NOT NULL DEFAULT FALSE, -- roles de sistema não podem ser deletadas
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_roles_ws_name_idx
  ON workspace_roles(workspace_id, name);

-- ── 3. Mapeamento role → permissão ────────────────────────
CREATE TABLE IF NOT EXISTS workspace_role_permissions (
  role_id       UUID NOT NULL REFERENCES workspace_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ── 4. workspace_members: FK opcional para role RBAC ───────
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS workspace_role_id UUID REFERENCES workspace_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workspace_members_role_idx
  ON workspace_members(workspace_role_id) WHERE workspace_role_id IS NOT NULL;

-- ── 5. RLS ────────────────────────────────────────────────

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_role_permissions ENABLE ROW LEVEL SECURITY;

-- permissions: leitura pública para autenticados (catálogo global, não sensível)
CREATE POLICY "autenticados podem ler permissões"
  ON permissions FOR SELECT TO authenticated USING (TRUE);

-- workspace_roles: membros leem, owner/admin escrevem
CREATE POLICY "membros leem roles do workspace"
  ON workspace_roles FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "owner e admin gerenciam roles"
  ON workspace_roles FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

-- workspace_role_permissions: mesmas regras via role_id
CREATE POLICY "membros leem permissões das roles"
  ON workspace_role_permissions FOR SELECT TO authenticated
  USING (
    role_id IN (
      SELECT id FROM workspace_roles
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

CREATE POLICY "owner e admin gerenciam permissões das roles"
  ON workspace_role_permissions FOR ALL TO authenticated
  USING (
    role_id IN (
      SELECT wr.id FROM workspace_roles wr
      JOIN workspace_members wm ON wm.workspace_id = wr.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.deleted_at IS NULL
    )
  );

-- ── 6. Seed: catálogo de permissões ───────────────────────
INSERT INTO permissions (key, description, module, action) VALUES
  ('leads:view',        'Ver leads',                 'leads',     'view'),
  ('leads:create',      'Criar leads',               'leads',     'create'),
  ('leads:edit',        'Editar leads',              'leads',     'edit'),
  ('leads:delete',      'Deletar leads',             'leads',     'delete'),
  ('contacts:view',     'Ver contatos',              'contacts',  'view'),
  ('contacts:create',   'Criar contatos',            'contacts',  'create'),
  ('contacts:edit',     'Editar contatos',           'contacts',  'edit'),
  ('contacts:delete',   'Deletar contatos',          'contacts',  'delete'),
  ('deals:view',        'Ver negociações',           'deals',     'view'),
  ('deals:create',      'Criar negociações',         'deals',     'create'),
  ('deals:edit',        'Editar negociações',        'deals',     'edit'),
  ('deals:delete',      'Deletar negociações',       'deals',     'delete'),
  ('chat:view',         'Ver conversas',             'chat',      'view'),
  ('chat:create',       'Enviar mensagens',          'chat',      'create'),
  ('chat:edit',         'Editar mensagens',          'chat',      'edit'),
  ('chat:delete',       'Deletar mensagens',         'chat',      'delete'),
  ('analytics:view',    'Ver analytics',             'analytics', 'view'),
  ('analytics:create',  'Criar relatórios',          'analytics', 'create'),
  ('analytics:edit',    'Editar relatórios',         'analytics', 'edit'),
  ('analytics:delete',  'Deletar relatórios',        'analytics', 'delete'),
  ('settings:view',     'Ver configurações',         'settings',  'view'),
  ('settings:create',   'Criar configurações',       'settings',  'create'),
  ('settings:edit',     'Editar configurações',      'settings',  'edit'),
  ('settings:delete',   'Deletar configurações',     'settings',  'delete'),
  ('members:view',      'Ver membros',               'members',   'view'),
  ('members:create',    'Convidar membros',          'members',   'create'),
  ('members:edit',      'Editar membros',            'members',   'edit'),
  ('members:delete',    'Remover membros',           'members',   'delete')
ON CONFLICT (key) DO NOTHING;

-- ── 7. Função: seed system roles para um workspace ────────
CREATE OR REPLACE FUNCTION seed_workspace_system_roles(ws_id UUID)
RETURNS VOID AS $$
DECLARE
  role_names TEXT[] := ARRAY['owner', 'admin', 'manager', 'sales', 'support'];
  rname      TEXT;
  rid        UUID;
  pkeys      TEXT[];
  pkey       TEXT;
  pid        UUID;
BEGIN
  FOREACH rname IN ARRAY role_names LOOP
    INSERT INTO workspace_roles (workspace_id, name, is_system)
    VALUES (ws_id, rname, TRUE)
    ON CONFLICT (workspace_id, name) DO NOTHING;

    SELECT id INTO rid FROM workspace_roles WHERE workspace_id = ws_id AND name = rname;

    CASE rname
      WHEN 'owner' THEN
        SELECT ARRAY(SELECT key FROM permissions) INTO pkeys;
      WHEN 'admin' THEN
        SELECT ARRAY(SELECT key FROM permissions WHERE key NOT IN ('settings:delete','members:delete'))
          INTO pkeys;
      WHEN 'manager' THEN
        pkeys := ARRAY[
          'leads:view','leads:create','leads:edit','leads:delete',
          'contacts:view','contacts:create','contacts:edit','contacts:delete',
          'deals:view','deals:create','deals:edit','deals:delete',
          'chat:view','chat:create','chat:edit',
          'analytics:view','analytics:create','analytics:edit',
          'settings:view','members:view'
        ];
      WHEN 'sales' THEN
        pkeys := ARRAY[
          'leads:view','leads:create','leads:edit',
          'contacts:view','contacts:create','contacts:edit',
          'deals:view','deals:create','deals:edit',
          'chat:view','chat:create','chat:edit',
          'analytics:view'
        ];
      WHEN 'support' THEN
        pkeys := ARRAY[
          'leads:view',
          'contacts:view','contacts:create','contacts:edit',
          'deals:view',
          'chat:view','chat:create','chat:edit','chat:delete'
        ];
      ELSE
        pkeys := ARRAY[]::TEXT[];
    END CASE;

    FOREACH pkey IN ARRAY pkeys LOOP
      SELECT id INTO pid FROM permissions WHERE key = pkey;
      IF pid IS NOT NULL THEN
        INSERT INTO workspace_role_permissions (role_id, permission_id)
        VALUES (rid, pid)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Trigger: seed automático ao criar workspace ─────────
CREATE OR REPLACE FUNCTION trg_seed_workspace_roles()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_workspace_system_roles(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_workspace_roles_seed ON workspaces;
CREATE TRIGGER trg_workspace_roles_seed
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION trg_seed_workspace_roles();

-- ── 9. Seed roles para workspaces existentes ───────────────
DO $$
DECLARE ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM workspaces LOOP
    PERFORM seed_workspace_system_roles(ws.id);
  END LOOP;
END;
$$;
