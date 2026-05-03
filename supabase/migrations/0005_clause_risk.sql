-- Clauseium risk analysis: persist per-clause risk findings inline on the clauses row.
-- RLS: inherited from existing clauses policies (tenant scoped via contracts.owner_user_id).

alter table public.clauses
  add column if not exists risk_level         text
    check (risk_level in ('high','medium','low','standard','missing')),
  add column if not exists risk_issue         text,
  add column if not exists risk_explanation   text,
  add column if not exists risk_suggestion    text,
  add column if not exists risk_confidence    numeric(4,3),
  add column if not exists risk_method        text
    check (risk_method in ('rule','llm','rule_llm_agree')),
  add column if not exists risk_rule_ids      text[]      not null default '{}',
  add column if not exists risk_analyzed_at   timestamptz;

create index if not exists clauses_risk_level_idx
  on public.clauses (risk_level)
  where risk_level is not null;
