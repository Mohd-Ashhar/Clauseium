-- 0013_llm_call_log.sql
-- Permanent, opt-in per-call cost observability for the AI pipeline.
--
-- Records cost-relevant METADATA only — model, category, which path produced the
-- call, token counts, and cache hits. It NEVER stores clause text or any contract
-- content, so it is DPDP-safe. Writes are gated by RISK_COST_LOG=1 and are
-- fire-and-forget (a missing table or column degrades to a silent no-op via the
-- migration-tolerant helper in src/lib/risk/cost-log.ts).
--
-- RLS is enabled with NO policies, so only the service role can read/write —
-- mirroring the posture of 0012_clause_analysis_cache.sql.

create table if not exists public.llm_call_log (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: real-time analyzer calls may not know the contract id.
  contract_id uuid,
  model text not null,
  category text,
  -- realtime | cascade_cheap | cascade_escalate | batch | doc | classify | cache_hit
  method text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_creation_tokens integer not null default 0,
  cache_hit boolean not null default false,
  semdedup_collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists llm_call_log_created_at_idx
  on public.llm_call_log (created_at);
create index if not exists llm_call_log_contract_id_idx
  on public.llm_call_log (contract_id);

alter table public.llm_call_log enable row level security;
-- Intentionally no policies: service-role only.
