/**
 * CLI: re-run the full ingestion + analysis pipeline for existing contracts.
 * Useful after parser/analysis fixes to regenerate clauses, risk, citations and
 * the overall score from the original uploaded file in storage.
 *
 *   npm run reprocess:contract -- --id=<uuid>
 *   npm run reprocess:contract -- --all
 *   npm run reprocess:contract -- --all --status=ready,failed
 *   npm run reprocess:contract -- --id=<uuid> --dry-run
 *
 * Run via tsx + the server-only shim (see package.json).
 */
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { processContract } from "@/lib/ingestion/orchestrate";
import type { ContractRecord } from "@/types/ingestion";

interface Args {
  id: string | null;
  all: boolean;
  statuses: string[] | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { id: null, all: false, statuses: null, dryRun: false };
  for (const arg of argv.slice(2)) {
    if (arg === "--all") out.all = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--id=")) out.id = arg.slice("--id=".length);
    else if (arg.startsWith("--status=")) {
      out.statuses = arg
        .slice("--status=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else throw new Error(`Unknown flag: ${arg}`);
  }
  if (!out.id && !out.all) {
    throw new Error("Provide --id=<uuid> or --all.");
  }
  return out;
}

const CONTRACT_COLUMNS =
  "id, owner_user_id, title, original_filename, mime_type, file_size_bytes, page_count, storage_path, status, error_message, structured_json, uploaded_at, processed_at";

async function main() {
  const args = parseArgs(process.argv);
  const client = createServiceRoleClient();

  let contracts: ContractRecord[];
  if (args.id) {
    const { data, error } = await client
      .from("contracts")
      .select(CONTRACT_COLUMNS)
      .eq("id", args.id)
      .limit(1);
    if (error) throw new Error(`fetch failed: ${error.message}`);
    contracts = (data ?? []) as ContractRecord[];
  } else {
    let q = client.from("contracts").select(CONTRACT_COLUMNS).order("uploaded_at");
    if (args.statuses) q = q.in("status", args.statuses);
    const { data, error } = await q;
    if (error) throw new Error(`fetch failed: ${error.message}`);
    contracts = (data ?? []) as ContractRecord[];
  }

  if (contracts.length === 0) {
    console.log("No matching contracts.");
    return;
  }

  console.log(
    `${args.dryRun ? "[dry-run] " : ""}Reprocessing ${contracts.length} contract(s)...`,
  );

  let ok = 0;
  let failed = 0;
  for (const contract of contracts) {
    const label = `${contract.id} (${contract.original_filename})`;
    if (args.dryRun) {
      console.log(`  would reprocess ${label}`);
      continue;
    }
    try {
      await processContract(contract);
      ok += 1;
      console.log(`  ✓ ${label}`);
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!args.dryRun) console.log(`Done. ${ok} ok, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
