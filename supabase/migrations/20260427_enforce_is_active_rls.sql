-- Corrige my_workspace_ids() para excluir workspaces inativados pelo superadmin.
-- Todas as RLS policies do sistema dependem desta função — o filtro propaga automaticamente.
-- O painel admin usa service_role (bypassa RLS) e continua enxergando workspaces inativos.
CREATE OR REPLACE FUNCTION my_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT wm.workspace_id
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid()
    AND w.is_active = true
$$ LANGUAGE sql SECURITY DEFINER STABLE;
