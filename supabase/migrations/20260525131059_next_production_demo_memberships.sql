create table if not exists public.workspace_memberships (
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.usage_snapshots (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  period text not null,
  snapshot_payload jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  demo_fixture_version text,
  created_at timestamptz not null default now()
);

alter table public.workspaces add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.workspaces add column if not exists demo_fixture_version text;
alter table public.decisions add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.decisions add column if not exists demo_fixture_version text;
alter table public.rag_chunks add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.rag_chunks add column if not exists demo_fixture_version text;
alter table public.accepted_facts add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.accepted_facts add column if not exists demo_fixture_version text;
alter table public.watchtower_runs add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.watchtower_runs add column if not exists demo_fixture_version text;
alter table public.report_artifacts add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.report_artifacts add column if not exists demo_fixture_version text;
alter table public.external_action_ledger add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.external_action_ledger add column if not exists demo_fixture_version text;

alter table public.workspace_memberships enable row level security;
alter table public.usage_snapshots enable row level security;

drop policy if exists workspace_memberships_select_own on public.workspace_memberships;
create policy workspace_memberships_select_own
  on public.workspace_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = workspaces.id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists usage_snapshots_select_member on public.usage_snapshots;
create policy usage_snapshots_select_member
  on public.usage_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = usage_snapshots.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists decisions_select_member on public.decisions;
create policy decisions_select_member
  on public.decisions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = decisions.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists rag_chunks_select_member on public.rag_chunks;
create policy rag_chunks_select_member
  on public.rag_chunks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = rag_chunks.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists accepted_facts_select_member on public.accepted_facts;
create policy accepted_facts_select_member
  on public.accepted_facts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = accepted_facts.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists watchtower_runs_select_member on public.watchtower_runs;
create policy watchtower_runs_select_member
  on public.watchtower_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = watchtower_runs.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists report_artifacts_select_member on public.report_artifacts;
create policy report_artifacts_select_member
  on public.report_artifacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = report_artifacts.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists external_actions_select_admin on public.external_actions;
create policy external_actions_select_admin
  on public.external_actions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = external_actions.workspace_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists external_action_ledger_select_admin on public.external_action_ledger;
create policy external_action_ledger_select_admin
  on public.external_action_ledger
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = external_action_ledger.workspace_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists retention_jobs_select_admin on public.retention_jobs;
create policy retention_jobs_select_admin
  on public.retention_jobs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = retention_jobs.workspace_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  );
