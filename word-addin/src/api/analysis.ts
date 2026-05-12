import { apiFetch } from "./client";
import type { AnalysisResponse } from "@addin/types/contract";

// GET /api/analysis/:id — full analysis payload.
//
// This is the route the web Workspace reads from too; the same shape is
// rendered in both surfaces so review behavior is identical.

export async function getAnalysis(
  contractId: string,
  accessToken: string,
): Promise<AnalysisResponse> {
  const response = await apiFetch(
    `/api/analysis/${contractId}`,
    { method: "GET" },
    accessToken,
  );
  return (await response.json()) as AnalysisResponse;
}
