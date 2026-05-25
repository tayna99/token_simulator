create extension if not exists vector with schema extensions;

create table if not exists public.workspaces (
  id text primary key,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  runtime_status text not null check (runtime_status in ('provider_llm', 'deterministic_preview', 'unavailable', 'connector_not_configured')),
  provider_run_id text,
  agent_invocation_proof jsonb not null default '[]'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.checkpoints (
  workspace_id text not null references public.workspaces(id) on delete cascade,
  thread_id text not null,
  checkpoint_id text not null,
  graph_state jsonb not null,
  status text not null check (status in ('interrupt_requested', 'resumed', 'completed', 'failed')),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, thread_id)
);

create table if not exists public.decisions (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  decision_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.external_actions (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  kind text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  approval jsonb,
  rollback_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_action_ledger (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  action_id text not null references public.external_actions(id) on delete cascade,
  connector_id text not null,
  connector_mode text not null check (connector_mode in ('dry_run', 'live')),
  idempotency_key text not null unique,
  external_ref text,
  rollback_metadata jsonb not null default '{}'::jsonb,
  ledger_payload jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default now()
);

create table if not exists public.rag_chunks (
  workspace_id text not null references public.workspaces(id) on delete cascade,
  chunk_id text not null,
  collection text not null,
  source_id text not null,
  source_url text not null,
  text text not null,
  refs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536) not null,
  content_hash text not null,
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, chunk_id)
);

create table if not exists public.accepted_facts (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  source_ref text not null,
  fact_payload jsonb not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  accepted_by text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists public.watchtower_runs (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  status text not null,
  parser_summary jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  started_at timestamptz not null,
  completed_at timestamptz
);

create table if not exists public.report_artifacts (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  report_run_id text not null,
  format text not null check (format in ('markdown', 'json', 'pdf')),
  content_type text not null,
  body text not null,
  download_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.retention_jobs (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('delete_artifact', 'export_audit')),
  status text not null check (status in ('scheduled', 'not_needed', 'completed', 'blocked')),
  artifact_id text,
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  audit_export_ref text,
  result_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.learning_loop_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  record_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rag_chunks_embedding_hnsw
  on public.rag_chunks using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists rag_chunks_workspace_collection_idx
  on public.rag_chunks (workspace_id, collection, source_id);

create or replace function public.match_rag_chunks (
  query_embedding extensions.vector(1536),
  match_workspace_id text,
  match_collection text,
  match_count int default 5,
  match_threshold float default 0.0
)
returns table (
  chunk_id text,
  collection text,
  source_url text,
  text text,
  refs jsonb,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    rag_chunks.chunk_id,
    rag_chunks.collection,
    rag_chunks.source_url,
    rag_chunks.text,
    rag_chunks.refs,
    rag_chunks.metadata,
    1 - (rag_chunks.embedding <=> query_embedding) as similarity
  from public.rag_chunks
  where rag_chunks.workspace_id = match_workspace_id
    and rag_chunks.collection = match_collection
    and 1 - (rag_chunks.embedding <=> query_embedding) > match_threshold
  order by rag_chunks.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.workspaces enable row level security;
alter table public.agent_runs enable row level security;
alter table public.checkpoints enable row level security;
alter table public.decisions enable row level security;
alter table public.external_actions enable row level security;
alter table public.external_action_ledger enable row level security;
alter table public.rag_chunks enable row level security;
alter table public.accepted_facts enable row level security;
alter table public.watchtower_runs enable row level security;
alter table public.report_artifacts enable row level security;
alter table public.retention_jobs enable row level security;
alter table public.learning_loop_records enable row level security;
