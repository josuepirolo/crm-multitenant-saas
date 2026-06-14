-- ============================================================
-- Passo 3 (CRM) — Autorização cross-service via claim JWT (ADR-007)
-- Fonte: backend_zapi/frontend/authz-architecture-and-crm-handoff.md
--        (§3 do claim CONGELADO v1 em 2026-06-13; §4 catálogo; §5 checklist)
--
-- O que faz:
--   1. Semeia 3 permissões `integration.whatsapp.*` no catálogo `permissions`.
--   2. Atualiza `seed_workspace_system_roles`: manager ganha `connection:view`.
--      (owner e admin herdam as 3 automaticamente — seus SELECTs já são dinâmicos:
--       owner = todas as permissões; admin = todas exceto *:delete de settings/members.)
--   3. Re-semeia as system roles de todos os workspaces existentes.
--   4. Cria o Custom Access Token Hook que carimba o claim `authz` (v1) no JWT.
--
-- ⚠️ Gramática da chave: as chaves de integração têm DOIS `:`
--    (`integration.whatsapp.instance:manage`). Confirmado seguro pelo front:
--    nenhum código faz split(':') em src/; `getWorkspaceContext` compara a chave
--    inteira. `${module}:${action}` reconstrói exatamente a `key`.
--
-- ⚠️ SEGURANÇA DO HOOK: roda em TODA emissão/refresh de token. É EXCEPTION-SAFE
--    por construção — qualquer falha devolve o `event` intacto, então nunca
--    bloqueia o login (cai em default-deny do lado dos integradores, que é o
--    comportamento seguro). Não ativa nada sozinho: só passa a valer quando o
--    hook for habilitado em Auth → Hooks (config), passo manual e consciente.
--
-- Idempotente: ON CONFLICT DO NOTHING, CREATE OR REPLACE, re-seed seguro.
-- ============================================================

-- ── 1. Catálogo: permissões de integração (channel-agnostic) ──────────────
INSERT INTO permissions (key, description, module, action) VALUES
  ('integration.whatsapp.connection:view',
     'Ver status/QR/listar instâncias WhatsApp', 'integration.whatsapp', 'connection:view'),
  ('integration.whatsapp.instance:manage',
     'Provisionar/reiniciar/desconectar instância WhatsApp', 'integration.whatsapp', 'instance:manage'),
  ('integration.whatsapp.account:edit',
     'Editar perfil/privacidade do número WhatsApp', 'integration.whatsapp', 'account:edit')
ON CONFLICT (key) DO NOTHING;

-- ── 2. seed function: manager += connection:view ───────────────────────────
-- Idêntica à original (20260427_rbac.sql §7), só estende o array do manager.
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
          'settings:view','members:view',
          'integration.whatsapp.connection:view'
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

-- ── 3. Re-seed dos workspaces existentes (concede as novas chaves) ─────────
DO $$
DECLARE ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM workspaces LOOP
    PERFORM seed_workspace_system_roles(ws.id);
  END LOOP;
END;
$$;

-- ── 4. Custom Access Token Hook — carimba o claim `authz` (v1) ─────────────
-- Resolve, por emissão de token: superadmin global + por workspace ativo o
-- `role` e os `perms` EFETIVOS de integração (granular via workspace_role_id;
-- senão a system role homônima — que espelha a matriz hardcoded de permissions.ts).
-- `perms` carrega SOMENTE chaves `integration.*` (os integradores só consomem
-- essas; mantém o token compacto — endereça proativamente a preocupação de
-- tamanho do §3). SECURITY DEFINER (lê tabelas sob RLS como dono) + STABLE.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_superadmin boolean;
  v_workspaces jsonb;
  v_authz      jsonb;
  v_claims     jsonb;
BEGIN
  v_user_id := (event->>'user_id')::uuid;

  SELECT COALESCE(p.is_superadmin, false) INTO v_superadmin
  FROM profiles p WHERE p.id = v_user_id;

  SELECT COALESCE(jsonb_object_agg(t.workspace_id::text, t.entry), '{}'::jsonb)
  INTO v_workspaces
  FROM (
    SELECT
      wm.workspace_id,
      jsonb_build_object(
        'role', wm.role,
        'perms', COALESCE((
          SELECT jsonb_agg(p.key ORDER BY p.key)
          FROM workspace_role_permissions wrp
          JOIN permissions p ON p.id = wrp.permission_id
          WHERE wrp.role_id = COALESCE(
                  wm.workspace_role_id,
                  (SELECT wr.id FROM workspace_roles wr
                    WHERE wr.workspace_id = wm.workspace_id
                      AND wr.name = wm.role::text
                      AND wr.is_system
                    LIMIT 1))
            AND p.key LIKE 'integration.%'
        ), '[]'::jsonb)
      ) AS entry
    FROM workspace_members wm
    WHERE wm.user_id = v_user_id AND wm.deleted_at IS NULL
  ) t;

  v_authz := jsonb_build_object(
    'v', 1,
    'superadmin', COALESCE(v_superadmin, false),
    'workspaces', v_workspaces
  );

  v_claims := COALESCE(event->'claims', '{}'::jsonb);
  v_claims := v_claims || jsonb_build_object('https://lekazis.app/authz', v_authz);
  event := jsonb_set(event, '{claims}', v_claims);

  RETURN event;
EXCEPTION WHEN OTHERS THEN
  -- NUNCA bloquear emissão de token. Falha → event intacto (sem claim → deny).
  RETURN event;
END;
$$;

-- Apenas o auth admin executa o hook; revoga de todos os demais papéis.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
