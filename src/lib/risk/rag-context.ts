import "server-only";
import type { ClassificationLabel } from "@/lib/classification/categories";
import { searchLegalCorpus } from "@/lib/rag/search";
import type { LegalReference } from "@/lib/rag/types";
import { RAG_SEED_QUERIES } from "./categories";

export interface RagContextOptions {
  topK?: number;
}

const DEFAULT_TOP_K = 5;

// Returns up to `topK` pre-verified statute/case snippets to ground the LLM analyzer.
// Failures (no embeddings, no corpus, etc.) degrade to an empty list so the
// pipeline remains rule-only-safe.
export async function getRagContext(
  category: ClassificationLabel,
  clauseText: string,
  opts: RagContextOptions = {},
): Promise<LegalReference[]> {
  const seed = RAG_SEED_QUERIES[category] ?? RAG_SEED_QUERIES.other;
  const head = clauseText.slice(0, 600).replace(/\s+/g, " ").trim();
  const query = head ? `${seed}\n${head}` : seed;
  const topK = opts.topK ?? DEFAULT_TOP_K;

  try {
    return await searchLegalCorpus(query, { topK });
  } catch (err) {
    console.warn(
      "[risk] rag context unavailable; analyzer will run without grounding:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export function formatRagSnippets(references: readonly LegalReference[]): string {
  if (references.length === 0) return "(no statute snippets available)";
  return references
    .slice(0, 5)
    .map((r) => {
      const m = r.metadata;
      const label =
        m.source === "statute"
          ? `${m.statute_name ?? "Statute"} s.${m.section ?? "?"} (${m.year ?? "n.d."})`
          : `${m.case_name ?? "Case"} (${m.court ?? ""} ${m.year ?? ""}) ${m.citation ?? ""}`.trim();
      const body = r.text.replace(/\s+/g, " ").trim().slice(0, 220);
      return `- [${label}] ${body}`;
    })
    .join("\n");
}
