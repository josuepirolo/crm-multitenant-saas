-- Rate limits: persistent distributed store (replaces in-memory)
CREATE TABLE IF NOT EXISTS rate_limits (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_key_created_idx ON rate_limits (key, created_at DESC);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No client-accessible policies — only service_role (admin client) reads/writes this table

-- Super admin can read all audit logs via explicit policy (no service_role bypass needed)
CREATE POLICY "superadmin can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_superadmin = true
    )
  );
