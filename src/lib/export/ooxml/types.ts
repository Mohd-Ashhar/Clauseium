export type RedlineMode = "redlined" | "clean";

// A clause to act on, already resolved by resolveExportText:
//   replace → swap the clause's text for newText (tracked change / plain)
//   insert  → a missing clause to add as proposed new content
//   skip    → leave the document untouched for this clause
export interface EngineClause {
  id: string;
  position: number;
  searchAnchor: string | null;
  clauseText: string;
  sectionTitle: string | null;
  op: "replace" | "insert" | "skip";
  newText: string;
}

export interface RevisionMeta {
  author: string;
  dateIso: string;
}

export interface ClauseManifestEntry {
  clauseId: string;
  position: number;
  outcome: "applied" | "fallback" | "skipped";
  reason: string;
}

export interface RedlineEngineResult {
  bytes: Buffer;
  applied: number;
  fallback: number;
  skipped: number;
  manifest: ClauseManifestEntry[];
}

export interface InjectRedlinesArgs {
  originalDocx: Buffer;
  clauses: EngineClause[];
  mode: RedlineMode;
  rev: RevisionMeta;
}
