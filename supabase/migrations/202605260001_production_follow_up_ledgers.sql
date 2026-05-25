create table if not exists public.watchtower_candidates (
  workspace_id text not null references public.workspaces(id) on delete cascade,
  id text not null,
  source_ref text not null,
  status text not null check (status in ('needs_review', 'accepted', 'rejected', 'held', 'superseded')),
  candidate_payload jsonb not null default '{}'::jsonb,
  parser_confidence text not null default 'medium' check (parser_confidence in ('high', 'medium', 'low')),
  manual_review_reason text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.fact_review_events (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  candidate_id text not null,
  action text not null check (action in ('accept', 'reject', 'hold', 'supersede')),
  reviewer text not null,
  reason text not null,
  fact_id text,
  source_ref text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.watchtower_candidates enable row level security;
alter table public.fact_review_events enable row level security;

alter table public.watchtower_candidates add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.watchtower_candidates add column if not exists demo_fixture_version text;
alter table public.fact_review_events add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.fact_review_events add column if not exists demo_fixture_version text;

create index if not exists watchtower_candidates_workspace_status_idx
  on public.watchtower_candidates (workspace_id, status, updated_at desc);

create index if not exists fact_review_events_workspace_candidate_idx
  on public.fact_review_events (workspace_id, candidate_id, created_at desc);

drop policy if exists watchtower_candidates_select_member on public.watchtower_candidates;
create policy watchtower_candidates_select_member
  on public.watchtower_candidates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = watchtower_candidates.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists fact_review_events_select_member on public.fact_review_events;
create policy fact_review_events_select_member
  on public.fact_review_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = fact_review_events.workspace_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists watchtower_candidates_admin_write on public.watchtower_candidates;
create policy watchtower_candidates_admin_write
  on public.watchtower_candidates
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = watchtower_candidates.workspace_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = watchtower_candidates.workspace_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists fact_review_events_admin_write on public.fact_review_events;
create policy fact_review_events_admin_write
  on public.fact_review_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = fact_review_events.workspace_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  );

grant usage on schema public to authenticated, service_role;

grant select on public.workspaces to authenticated;
grant select on public.workspace_memberships to authenticated;
grant select on public.usage_snapshots to authenticated;
grant select on public.agent_runs to authenticated;
grant select on public.checkpoints to authenticated;
grant select on public.decisions to authenticated;
grant select on public.external_actions to authenticated;
grant select on public.external_action_ledger to authenticated;
grant select on public.rag_chunks to authenticated;
grant select on public.accepted_facts to authenticated;
grant select on public.watchtower_runs to authenticated;
grant select on public.watchtower_candidates to authenticated;
grant select on public.fact_review_events to authenticated;
grant select on public.report_artifacts to authenticated;
grant select on public.retention_jobs to authenticated;
grant select on public.learning_loop_records to authenticated;

grant all on public.workspaces to service_role;
grant all on public.workspace_memberships to service_role;
grant all on public.usage_snapshots to service_role;
grant all on public.agent_runs to service_role;
grant all on public.checkpoints to service_role;
grant all on public.decisions to service_role;
grant all on public.external_actions to service_role;
grant all on public.external_action_ledger to service_role;
grant all on public.rag_chunks to service_role;
grant all on public.accepted_facts to service_role;
grant all on public.watchtower_runs to service_role;
grant all on public.watchtower_candidates to service_role;
grant all on public.fact_review_events to service_role;
grant all on public.report_artifacts to service_role;
grant all on public.retention_jobs to service_role;
grant all on public.learning_loop_records to service_role;

grant execute on function public.match_rag_chunks(
  extensions.vector,
  text,
  text,
  int,
  float
) to authenticated, service_role;
