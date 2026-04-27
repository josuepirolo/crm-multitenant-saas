-- Adiciona coluna is_active para gestão de workspaces pelo superadmin
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Índice para filtros por status
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces(is_active);
