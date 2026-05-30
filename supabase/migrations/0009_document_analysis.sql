-- Phase 1: whole-document analysis (missing protections, cross-clause issues,
-- one-sided terms, executive summary, detected contract type).
-- Stored as a jsonb blob on the contracts row — read alongside the contract,
-- tenant-scoped by the existing contracts RLS policies (no new policy needed).
--
-- Also adds analysis_summary for richer per-stage processing telemetry. The
-- application treats both columns as best-effort: writes are wrapped so a
-- deploy that has not yet run this migration keeps working (partial-analysis
-- state continues to ride on error_message until this is applied).

alter table public.contracts
  add column if not exists document_analysis jsonb,
  add column if not exists analysis_summary  jsonb;
