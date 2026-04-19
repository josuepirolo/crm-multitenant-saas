-- Índices únicos parciais: por workspace, ignorando registros deletados e valores vazios
-- Isso garante que não existam dois leads/contatos ativos com mesmo telefone ou email no mesmo workspace

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_phone
  ON contacts(workspace_id, phone)
  WHERE phone IS NOT NULL AND phone != '' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_email
  ON contacts(workspace_id, email)
  WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL;
