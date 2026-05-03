import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchLegalCorpus } from "@/lib/rag/search";
import { embedQuery } from "@/lib/rag/embed";
import {
  canonicalize,
  extractSectionNumber,
  jaccard,
} from "./normalize";
import { cosineSim } from "./relevance";
import type { ExtractedCitation, SourceCheck } from "./types";

export const LOCAL_FUSED_THRESHOLD = 0.55;
export const NEUTRAL_RELEVANCE = 0.5;

interface LegalDocumentRow {
  id: string;
  source: "statute" | "case";
  statute_name: string | null;
  section: string | null;
  case_name: string | null;
  citation: string | null;
  url: string | null;
  year: number | null;
}

export interface LocalCheckDeps {
  supabase: SupabaseClient;
  // Pre-computed clause embedding; if null, relevance is treated as neutral.
  clauseEmbedding: number[] | null;
}

export async function checkLocal(
  citation: ExtractedCitation,
  deps: LocalCheckDeps,
  signal?: AbortSignal,
): Promise<SourceCheck> {
  const start = Date.now();

  if (signal?.aborted) {
    return {
      checked: false,
      confirmed: false,
      relevance: 0,
      latencyMs: 0,
      error: "aborted",
    };
  }

  if (!citation.formatValid) {
    return {
      checked: true,
      confirmed: false,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: "format invalid",
    };
  }

  // Step 1: exact match on (statute_name, section) or (case_name, year).
  const exactHit = await exactMatch(citation, deps.supabase);
  if (exactHit) {
    const relevance = await computeRelevance(
      deps.supabase,
      exactHit.id,
      deps.clauseEmbedding,
    );
    return {
      checked: true,
      confirmed: true,
      url: exactHit.url ?? undefined,
      relevance,
      latencyMs: Date.now() - start,
      error: null,
    };
  }

  // Step 2: hybrid search fallback.
  const hits = await searchLegalCorpus(citationQueryString(citation), {
    topK: 3,
  });
  const top = hits[0];
  if (!top || top.scores.fused < LOCAL_FUSED_THRESHOLD) {
    return {
      checked: true,
      confirmed: false,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: null,
    };
  }

  const relevance = deps.clauseEmbedding
    ? await computeRelevanceFromText(top.text, deps.clauseEmbedding)
    : NEUTRAL_RELEVANCE;

  return {
    checked: true,
    confirmed: true,
    url: top.metadata.url,
    relevance,
    latencyMs: Date.now() - start,
    error: null,
  };
}

async function exactMatch(
  citation: ExtractedCitation,
  supabase: SupabaseClient,
): Promise<LegalDocumentRow | null> {
  const canonStatute = canonicalize(citation.caseOrStatute);
  const section = extractSectionNumber(citation.sectionOrCitation);

  if (section) {
    const { data } = await supabase
      .from("legal_documents")
      .select("id, source, statute_name, section, case_name, citation, url, year")
      .eq("source", "statute")
      .ilike("statute_name", `%${canonStatute}%`)
      .ilike("section", `${section}%`)
      .limit(1);
    const row = (data ?? [])[0] as LegalDocumentRow | undefined;
    if (row) return row;
  }

  // Case lookup by name + optional year.
  let q = supabase
    .from("legal_documents")
    .select("id, source, statute_name, section, case_name, citation, url, year")
    .eq("source", "case")
    .ilike("case_name", `%${canonStatute}%`)
    .limit(5);
  if (citation.year !== null) q = q.eq("year", citation.year);
  const { data: caseRows } = await q;
  const candidates = (caseRows ?? []) as LegalDocumentRow[];
  const target = canonicalize(
    `${citation.caseOrStatute} ${citation.sectionOrCitation}`,
  );
  for (const row of candidates) {
    const candidate = canonicalize(
      `${row.case_name ?? ""} ${row.citation ?? ""}`,
    );
    if (jaccard(target, candidate) >= 0.5) return row;
  }
  return null;
}

async function computeRelevance(
  supabase: SupabaseClient,
  documentId: string,
  clauseEmbedding: number[] | null,
): Promise<number> {
  if (!clauseEmbedding) return NEUTRAL_RELEVANCE;
  const { data } = await supabase
    .from("legal_chunks")
    .select("embedding")
    .eq("document_id", documentId)
    .limit(1);
  const row = (data ?? [])[0] as { embedding: unknown } | undefined;
  if (!row?.embedding) return NEUTRAL_RELEVANCE;
  const vec = parseEmbedding(row.embedding);
  if (!vec) return NEUTRAL_RELEVANCE;
  return cosineSim(clauseEmbedding, vec);
}

async function computeRelevanceFromText(
  text: string,
  clauseEmbedding: number[],
): Promise<number> {
  try {
    const chunkVec = await embedQuery(text);
    return cosineSim(clauseEmbedding, chunkVec);
  } catch {
    return NEUTRAL_RELEVANCE;
  }
}

function citationQueryString(citation: ExtractedCitation): string {
  const parts = [citation.caseOrStatute, citation.sectionOrCitation];
  if (citation.year !== null) parts.push(String(citation.year));
  return parts.join(" ").trim();
}

function parseEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}
