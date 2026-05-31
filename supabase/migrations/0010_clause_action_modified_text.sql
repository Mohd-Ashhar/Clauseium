-- 0010: reviewer-edited redline text for the "Modify" workflow.
--
-- When a reviewer clicks "Modify" on a clause and edits the AI's suggested
-- redline, their final wording is stored here and used verbatim by the export
-- engines (redlined + clean DOCX). Nullable; only populated when
-- clause_actions.state = 'modified', else null.
--
-- Inherits the existing clause_actions RLS policies (no new policy needed —
-- the column lives on an already-tenant-scoped table). Idempotent.

alter table public.clause_actions
  add column if not exists modified_text text;

comment on column public.clause_actions.modified_text is
  'Reviewer-edited clause wording; set only when state = modified, else null. Length is capped (20000) by the API (Zod), not a SQL CHECK, so the Word add-in (which never sends it) and legacy rows are never rejected.';
