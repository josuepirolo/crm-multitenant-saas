-- =============================================================================
-- DDL AUDIT LOG + EVENT TRIGGERS (R-007)
-- =============================================================================
-- Por quê: em 2026-06-08 a tabela business_niches foi dropada da produção via
-- SQL ad-hoc (fora do framework de migrations), sem deixar NENHUM rastro, e
-- causou outage site-wide (PGRST200 no login de todos os usuários). Ver
-- .sdds/discoveries/2026-06-08-business-niches-outage.md e risco R-007.
--
-- O quê: registra TODO comando DDL executado no banco (CREATE/ALTER/DROP/
-- COMMENT/GRANT etc.) em ddl_audit_log, via event triggers nativos do
-- Postgres (ddl_command_end + sql_drop). Qualquer DDL feito pelo SQL Editor,
-- por ferramenta externa ou por migration fica com rastro de quem/quando/o quê.
--
-- Acesso: append-only. Escrita só pelos event triggers (SECURITY DEFINER);
-- leitura só para superadmin via policy explícita (mesmo padrão de audit_logs).
-- =============================================================================

-- 1. Tabela de auditoria
CREATE TABLE IF NOT EXISTS ddl_audit_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  executed_at     timestamptz NOT NULL DEFAULT now(),
  role_name       text NOT NULL DEFAULT current_user,
  session_role    text NOT NULL DEFAULT session_user,
  event           text NOT NULL,            -- 'ddl_command_end' | 'sql_drop'
  command_tag     text,                     -- ex: 'DROP TABLE', 'ALTER TABLE'
  object_type     text,                     -- ex: 'table', 'index', 'policy'
  schema_name     text,
  object_identity text,                     -- ex: 'public.business_niches'
  query           text                      -- SQL original (truncado em 10k)
);

CREATE INDEX IF NOT EXISTS idx_ddl_audit_log_executed_at
  ON ddl_audit_log (executed_at DESC);

-- 2. RLS: leitura só superadmin; nenhuma policy de escrita para clients
ALTER TABLE ddl_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin can read ddl audit log" ON ddl_audit_log;
CREATE POLICY "superadmin can read ddl audit log"
  ON ddl_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_superadmin = true
    )
  );

-- Append-only: revoga escrita dos roles de API (escrita só via trigger)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ddl_audit_log FROM anon, authenticated;

-- 3. Função para ddl_command_end (CREATE/ALTER/COMMENT/GRANT...)
--    SECURITY DEFINER (owner: postgres) para inserir mesmo quando o DDL roda
--    sob outro role. Exception-safe: auditoria NUNCA pode bloquear um DDL.
CREATE OR REPLACE FUNCTION log_ddl_command()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    -- ignora objetos temporários (ruído de sessão)
    CONTINUE WHEN r.schema_name IS NOT NULL AND r.schema_name LIKE 'pg\_temp%';

    INSERT INTO ddl_audit_log (event, command_tag, object_type, schema_name, object_identity, query)
    VALUES ('ddl_command_end', r.command_tag, r.object_type, r.schema_name, r.object_identity,
            left(current_query(), 10000));
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  NULL; -- nunca propagar erro de auditoria para o DDL em si
END;
$$;

-- 4. Função para sql_drop (DROP TABLE/INDEX/POLICY... — o caso do incidente)
CREATE OR REPLACE FUNCTION log_ddl_drop()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    CONTINUE WHEN r.schema_name IS NOT NULL AND r.schema_name LIKE 'pg\_temp%';

    INSERT INTO ddl_audit_log (event, command_tag, object_type, schema_name, object_identity, query)
    VALUES ('sql_drop', 'DROP', r.object_type, r.schema_name, r.object_identity,
            left(current_query(), 10000));
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 5. Event triggers (idempotente: drop antes de criar)
DROP EVENT TRIGGER IF EXISTS ddl_audit_command_end;
CREATE EVENT TRIGGER ddl_audit_command_end
  ON ddl_command_end
  EXECUTE FUNCTION log_ddl_command();

DROP EVENT TRIGGER IF EXISTS ddl_audit_sql_drop;
CREATE EVENT TRIGGER ddl_audit_sql_drop
  ON sql_drop
  EXECUTE FUNCTION log_ddl_drop();

-- 6. Autoverificação: este COMMENT é DDL e roda DEPOIS dos triggers criados,
--    logo deve aparecer como primeira linha em ddl_audit_log.
COMMENT ON TABLE ddl_audit_log IS
  'Auditoria append-only de DDL via event triggers (R-007). Escrita só pelos triggers; leitura só superadmin.';
