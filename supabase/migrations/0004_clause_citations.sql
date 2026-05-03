-- Clauseium citation verification: persist verified citations + per-clause trust score.

alter table public.clauses
  add column if not exists citations         jsonb       not null default '[]'::jsonb,
  add column if not exists trust_score       numeric(4,3),
  add column if not exists verification_log  jsonb       not null default '[]'::jsonb,
  add column if not exists citations_updated_at timestamptz;

create index if not exists clauses_trust_score_idx
  on public.clauses (trust_score)
  where trust_score is not null;
