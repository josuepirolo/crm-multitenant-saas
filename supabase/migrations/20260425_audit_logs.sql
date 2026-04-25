create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete set null,
  user_id      uuid references auth.users(id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  ip_address   text,
  user_agent   text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

alter table audit_logs enable row level security;

create index if not exists audit_logs_workspace_idx on audit_logs (workspace_id, created_at desc);
create index if not exists audit_logs_user_idx     on audit_logs (user_id, created_at desc);

-- Workspace members can read their own workspace's logs
create policy "workspace members can read audit logs"
  on audit_logs for select
  to authenticated
  using (
    workspace_id is not null
    and exists (
      select 1 from workspace_members wm
      where wm.workspace_id = audit_logs.workspace_id
        and wm.user_id = auth.uid()
        and wm.deleted_at is null
    )
  );

-- No INSERT / UPDATE / DELETE via client — service_role only (bypasses RLS)
