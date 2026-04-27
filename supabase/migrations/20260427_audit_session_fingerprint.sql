-- Adiciona rastreamento de sessão e fingerprint na tabela audit_logs.
-- session_id: identificador opaco gerado no login (UUID, não derivado de dados do usuário).
-- fingerprint: hash SHA-256 truncado de IP parcial + user_agent + salt — apenas para correlação.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id  TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS fingerprint TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_session_idx
  ON audit_logs (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_fingerprint_idx
  ON audit_logs (fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_ws_session_idx
  ON audit_logs (workspace_id, session_id, created_at DESC)
  WHERE session_id IS NOT NULL;
