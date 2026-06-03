-- Idempotent / resumable processing.
--
-- The status-route stale-reclaim used to measure "stuck" age from uploaded_at,
-- and processContract re-ran the WHOLE LLM pipeline from scratch on a reclaim —
-- so a slow (e.g. 99-page) contract that ran past the serverless window, or just
-- past 7 minutes, got billed to Anthropic two or three times.
--
-- These columns let us (a) measure processing age from when processing actually
-- began, and (b) keep a liveness heartbeat that the orchestrator bumps as it
-- works, so a healthy long-running analysis is never reclaimed (and never
-- double-charged). Both are best-effort: the app tolerates their absence so a
-- deploy that has not yet run this migration keeps working.

alter table public.contracts
  add column if not exists processing_started_at timestamptz,
  add column if not exists analysis_heartbeat_at  timestamptz;
