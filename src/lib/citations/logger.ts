import type { PipelineLogEntry, VerifyLogEntry } from "./types";

export function logVerification(entry: VerifyLogEntry): void {
  console.log(JSON.stringify(entry));
}

export function logPipeline(entry: PipelineLogEntry): void {
  console.log(JSON.stringify(entry));
}

export function logVerificationError(
  citationId: string,
  clauseId: string,
  source: "local" | "kanoon",
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.log(
    JSON.stringify({
      evt: "citation.verify.error",
      ts: new Date().toISOString(),
      citation_id: citationId,
      clause_id: clauseId,
      source,
      error: message.slice(0, 400),
    }),
  );
}
