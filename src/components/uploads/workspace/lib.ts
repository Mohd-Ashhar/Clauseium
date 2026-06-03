// Pure, framework-free logic for the workspace. Extracted so it can be unit
// tested (lib.test.ts) and reused by the panes — and so the component
// decomposition is provably behavior-preserving for the parts that matter.
import type { CitationStatus } from "@/types/contract";
import type { ClauseWorkspaceItem, FilterLevel } from "./shared";
import { RISK_RANK } from "./shared";

// Remove inline [CITE:…] tokens the model emits, tidying stray spaces.
export function stripCiteTokens(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/\s*\[CITE:[^\]]+\]/gi, "")
    .replace(/\s+\./g, ".")
    .trim();
}

// The visible clause list for a filter: filter, then sort by risk rank, then by
// document position. Mirrors the previous inline `visible` memo exactly.
export function sortAndFilterClauses(
  clauses: ClauseWorkspaceItem[],
  filter: FilterLevel,
): ClauseWorkspaceItem[] {
  let list = clauses;
  if (filter === "high") list = list.filter((c) => c.risk?.level === "high");
  else if (filter === "medium")
    list = list.filter((c) => c.risk?.level === "medium");
  else if (filter === "missing")
    list = list.filter((c) => c.risk?.level === "missing");
  else if (filter === "standard")
    list = list.filter(
      (c) => !c.risk || c.risk.level === "low" || c.risk.level === "standard",
    );
  return [...list].sort((a, b) => {
    const ar = a.risk ? RISK_RANK[a.risk.level] : 4;
    const br = b.risk ? RISK_RANK[b.risk.level] : 4;
    if (ar !== br) return ar - br;
    return a.position - b.position;
  });
}

// --- Authorities (citations) aggregation -----------------------------------

export interface Authority {
  key: string;
  source: string;
  section: string;
  label: string;
  url: string | null;
  warning: string | null;
  status: CitationStatus;
  relying: { clauseId: string; position: number }[];
}

// "worst" status wins so a single unverified use isn't hidden behind a verified one.
export const STATUS_RANK: Record<CitationStatus, number> = {
  unverified: 0,
  partially_verified: 1,
  verified: 2,
};

export function buildAuthorities(clauses: ClauseWorkspaceItem[]): Authority[] {
  const map = new Map<string, Authority>();
  for (const clause of clauses) {
    for (const c of clause.citations) {
      const section = c.section.replace(/^section\s+/i, "").trim();
      const key = `${c.source}|${section}`.toLowerCase();
      const label = section ? `${c.source} § ${section}` : c.source;
      const existing = map.get(key);
      if (existing) {
        if (STATUS_RANK[c.status] < STATUS_RANK[existing.status])
          existing.status = c.status;
        if (!existing.relying.some((r) => r.clauseId === clause.id))
          existing.relying.push({ clauseId: clause.id, position: clause.position });
        existing.url = existing.url ?? c.url ?? null;
        existing.warning = existing.warning ?? c.warning ?? null;
      } else {
        map.set(key, {
          key,
          source: c.source,
          section,
          label,
          url: c.url ?? null,
          warning: c.warning ?? null,
          status: c.status,
          relying: [{ clauseId: clause.id, position: clause.position }],
        });
      }
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      b.relying.length - a.relying.length,
  );
}

// --- Keyboard navigation ----------------------------------------------------

// The clause id `delta` steps from the active clause within `list` (clamped).
export function clauseAtOffset(
  list: ClauseWorkspaceItem[],
  activeId: string | null,
  delta: number,
): string | null {
  if (list.length === 0) return null;
  const idx = list.findIndex((c) => c.id === activeId);
  const start = idx < 0 ? 0 : idx + delta;
  const clamped = Math.max(0, Math.min(list.length - 1, start));
  return list[clamped].id;
}

// Next (or previous) high-risk clause id, wrapping around the high-risk subset.
export function nextHighRiskClause(
  list: ClauseWorkspaceItem[],
  activeId: string | null,
  forward: boolean,
): string | null {
  const highs = list.filter((c) => c.risk?.level === "high");
  if (highs.length === 0) return null;
  const cur = list.find((c) => c.id === activeId);
  const curPos = cur ? cur.position : -1;
  const target = forward
    ? highs.find((c) => c.position > curPos) ?? highs[0]
    : [...highs].reverse().find((c) => c.position < curPos) ??
      highs[highs.length - 1];
  return target.id;
}
