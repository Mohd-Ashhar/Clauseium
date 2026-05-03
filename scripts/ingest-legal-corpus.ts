/**
 * One-shot CLI: ingest seed Indian legal corpus into Supabase.
 *
 *   npm run ingest:legal -- --dir=data/legal-corpus --reset
 *
 * (or directly:
 *   npx tsx --require ./scripts/server-only-shim.cjs scripts/ingest-legal-corpus.ts --reset
 * )
 *
 * Flags:
 *   --dir=<path>           Source directory of JSON seed files (default: data/legal-corpus)
 *   --reset                Truncate legal_documents and legal_chunks before insert
 *   --only=statute|case    Restrict ingestion to a single source kind
 */

import { readdir, readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { chunkCase, chunkStatute } from "@/lib/rag/chunking";
import { embedBatch } from "@/lib/rag/embed";
import {
  seedSchema,
  type CaseSeed,
  type ChunkInput,
  type Seed,
  type StatuteSeed,
} from "@/lib/rag/types";

interface Args {
  dir: string;
  reset: boolean;
  only: "statute" | "case" | null;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dir: "data/legal-corpus", reset: false, only: null };
  for (const arg of argv.slice(2)) {
    if (arg === "--reset") out.reset = true;
    else if (arg.startsWith("--dir=")) out.dir = arg.slice("--dir=".length);
    else if (arg.startsWith("--only=")) {
      const v = arg.slice("--only=".length);
      if (v !== "statute" && v !== "case") {
        throw new Error(`--only must be 'statute' or 'case', got '${v}'`);
      }
      out.only = v;
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return out;
}

function statuteTitle(seed: StatuteSeed): string {
  return seed.statute_name;
}

function caseTitle(seed: CaseSeed): string {
  return `${seed.case_name}, ${seed.citation}`;
}

async function loadSeeds(dir: string): Promise<Seed[]> {
  const abs = resolvePath(process.cwd(), dir);
  const entries = await readdir(abs);
  const out: Seed[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const raw = await readFile(resolvePath(abs, name), "utf8");
    const parsed = seedSchema.parse(JSON.parse(raw));
    out.push(parsed);
  }
  return out;
}

async function ingestSeed(
  supa: ReturnType<typeof createServiceRoleClient>,
  seed: Seed,
): Promise<{ docId: string; chunkCount: number }> {
  let docRow: { id: string };

  if (seed.kind === "statute") {
    const upsert = await supa
      .from("legal_documents")
      .upsert(
        {
          source: "statute",
          statute_name: seed.statute_name,
          year: seed.year,
          jurisdiction: "India",
          url: seed.url ?? null,
          title: statuteTitle(seed),
        },
        { onConflict: "source,statute_name,section,case_name,citation" },
      )
      .select("id")
      .single();
    if (upsert.error) throw new Error(`legal_documents upsert: ${upsert.error.message}`);
    docRow = upsert.data;
  } else {
    const upsert = await supa
      .from("legal_documents")
      .upsert(
        {
          source: "case",
          case_name: seed.case_name,
          citation: seed.citation,
          court: seed.court,
          year: seed.year,
          jurisdiction: "India",
          url: seed.url ?? null,
          title: caseTitle(seed),
        },
        { onConflict: "source,statute_name,section,case_name,citation" },
      )
      .select("id")
      .single();
    if (upsert.error) throw new Error(`legal_documents upsert: ${upsert.error.message}`);
    docRow = upsert.data;
  }

  const inputs: ChunkInput[] =
    seed.kind === "statute" ? chunkStatute(seed) : chunkCase(seed);

  if (inputs.length === 0) return { docId: docRow.id, chunkCount: 0 };

  const embeddings = await embedBatch(inputs.map((c) => c.text));

  const rows = inputs.map((c, i) => ({
    document_id: docRow.id,
    ord: c.ord,
    text: c.text,
    metadata: c.metadata,
    embedding: toVectorLiteral(embeddings[i]),
  }));

  const insert = await supa
    .from("legal_chunks")
    .upsert(rows, { onConflict: "document_id,ord" });
  if (insert.error) throw new Error(`legal_chunks upsert: ${insert.error.message}`);

  return { docId: docRow.id, chunkCount: rows.length };
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const supa = createServiceRoleClient();

  if (args.reset) {
    console.log("reset: truncating legal_chunks, legal_documents");
    const c = await supa.from("legal_chunks").delete().not("id", "is", null);
    if (c.error) throw new Error(`reset chunks: ${c.error.message}`);
    const d = await supa.from("legal_documents").delete().not("id", "is", null);
    if (d.error) throw new Error(`reset documents: ${d.error.message}`);
  }

  const seeds = (await loadSeeds(args.dir)).filter(
    (s) => args.only === null || s.kind === args.only,
  );
  console.log(`loaded ${seeds.length} seed file(s) from ${args.dir}`);

  let totalChunks = 0;
  for (const seed of seeds) {
    const label =
      seed.kind === "statute"
        ? `statute ${seed.statute_name}`
        : `case ${seed.case_name} (${seed.citation})`;
    const { chunkCount } = await ingestSeed(supa, seed);
    totalChunks += chunkCount;
    console.log(`  • ${label} → ${chunkCount} chunk(s)`);
  }

  console.log(`done: ${seeds.length} document(s), ${totalChunks} chunk(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
