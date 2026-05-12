import { apiFetch, ApiError } from "./client";
import type { ByHashResponse } from "@addin/types/contract";

// GET /api/contracts/by-hash/:sha256
// Returns the most recent contract for the current user whose uploaded
// bytes hash to the given SHA-256, or null if we've never seen this file.
// Used as the very first step in the upload flow so re-opening a known
// .docx skips the re-upload + re-analysis round trip.

export async function lookupByHash(
  sha256: string,
  accessToken: string,
): Promise<ByHashResponse | null> {
  try {
    const response = await apiFetch(
      `/api/contracts/by-hash/${sha256}`,
      { method: "GET" },
      accessToken,
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ApiError(
        response.status,
        "by_hash_failed",
        `by-hash returned ${response.status}`,
      );
    }
    return (await response.json()) as ByHashResponse;
  } catch (err) {
    // ApiError with status 404 already returned null above. Treat any
    // 404 that slipped through as "not found" too.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
