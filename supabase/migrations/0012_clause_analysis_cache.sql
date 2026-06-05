-- Cross-contract clause-analysis cache.
--
-- Long contracts (and a customer's many contracts) repeat the same boilerplate
-- verbatim — notice blocks, definitions, schedule headers. Risk analysis is
-- deterministic on (clause text + category) at a fixed analyzer version, so we
-- analyze each unique clause ONCE and reuse the result across contracts. This is
-- quality-neutral (identical input → identical analysis) and cuts the dominant
-- per-clause LLM cost for repeat content.
--
-- Privacy / DPDP posture: we store the content HASH (never the raw clause text)
-- plus the DERIVED analysis, and entries are short-lived — reads ignore anything
-- older than the retention window and a cleanup deletes stale rows. Accessed only
-- by the ingestion worker via the service-role client (which bypasses RLS); RLS
-- is enabled with no policies so anon/authenticated roles cannot read it.

create table if not exists public.clause_analysis_cache (
  cache_key        text primary key,
  analyzer_version integer not null,
  result           jsonb not null,
  model            text,
  created_at       timestamptz not null default now()
);

create index if not exists clause_analysis_cache_created_idx
  on public.clause_analysis_cache (created_at);

alter table public.clause_analysis_cache enable row level security;
