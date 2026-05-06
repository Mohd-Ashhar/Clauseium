import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { embedQuery } from "@/lib/rag/embed";
import { verifyCitations } from "@/lib/rag/verify";
import {
  metadataSchema,
  type HybridHit,
  type LegalReference,
} from "@/lib/rag/types";

export interface SearchOptions {
  topK?: number;
  /**
   * DPDP guard: query text and embedding are never logged unless this is true.
   */
  logQuery?: boolean;
}

const DEFAULT_TOP_K = 8;
const K_EACH = 30;

// Module-scoped flag so the empty-corpus warning fires at most once per
// process. Silent corpus emptiness used to hide misconfigured deploys —
// this surface it without spamming logs.
let emptyCorpusChecked = false;

async function warnIfCorpusEmpty(
  supa: ReturnType<typeof createServiceRoleClient>,
): Promise<void> {
  if (emptyCorpusChecked) return;
  emptyCorpusChecked = true;
  const { count, error } = await supa
    .from("legal_documents")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.warn(`rag.search corpus check failed: ${error.message}`);
    return;
  }
  if ((count ?? 0) === 0) {
    console.warn(
      "rag.search corpus empty — did you run npm run ingest:legal?",
    );
  }
}

export async function searchLegalCorpus(
  query: string,
  opts: SearchOptions = {},
): Promise<LegalReference[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const topK = opts.topK ?? DEFAULT_TOP_K;
  const start = Date.now();

  const supa = createServiceRoleClient();
  await warnIfCorpusEmpty(supa);
  const qEmbedding = await embedQuery(trimmed);

  const { data, error } = await supa.rpc("hybrid_legal_search", {
    q_embedding: qEmbedding,
    q_text: trimmed,
    k_each: K_EACH,
    k_final: topK,
  });
  if (error) throw new Error(`hybrid_legal_search failed: ${error.message}`);

  const rows = (data ?? []) as HybridHit[];
  const ids = rows.map((r) => r.chunk_id);
  const verified = await verifyCitations(supa, ids);

  const out: LegalReference[] = [];
  for (const row of rows) {
    if (!verified.has(row.chunk_id)) continue;
    const metadata = metadataSchema.safeParse(row.metadata);
    if (!metadata.success) continue;
    out.push({
      id: row.chunk_id,
      document_id: row.document_id,
      text: row.text,
      metadata: metadata.data,
      scores: {
        semantic: row.semantic,
        lexical: row.lexical,
        fused: row.fused,
      },
      citation_verified: true,
    });
  }

  const ms = Date.now() - start;
  if (opts.logQuery === true) {
    console.log(`rag.search ms=${ms} hits=${out.length} q=${JSON.stringify(trimmed)}`);
  } else {
    console.log(`rag.search ms=${ms} hits=${out.length}`);
  }

  return out;
}
