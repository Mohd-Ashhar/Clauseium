import { apiFetch, ApiError } from "./client";

// /api/contracts/:id/status — fetch + poll helpers.
//
// The status enum mirrors the contract_status Postgres enum on the server:
// queued → processing → ready (or failed). The /upload route returns
// "queued" immediately and Vercel's after() kicks the orchestrator; we
// poll until the row flips to "ready" or "failed".

export type ContractStatus = "queued" | "processing" | "ready" | "failed";

export interface StatusResponse {
  id: string;
  status: ContractStatus;
  error_message: string | null;
  page_count: number | null;
  processed_at: string | null;
  uploaded_at: string;
}

export async function getStatus(
  contractId: string,
  accessToken: string,
): Promise<StatusResponse> {
  const response = await apiFetch(
    `/api/contracts/${contractId}/status`,
    { method: "GET" },
    accessToken,
  );
  return (await response.json()) as StatusResponse;
}

export interface PollOptions {
  // Called every time the status is polled, regardless of whether it
  // changed. Use this to drive a progress UI.
  onTick?: (status: StatusResponse) => void;
  // AbortSignal lets the caller cancel polling (e.g. on component unmount).
  signal?: AbortSignal;
}

// Polls until status === "ready" or "failed". Returns the final response.
// Resolves the access token fresh each poll via the provided getter so
// expired tokens get refreshed transparently.
//
// Cadence: 2s for the first 30s, then 5s after — matches the orchestrator's
// typical 10-60s completion time without hammering Vercel.
//
// Hard timeout: 5 minutes. After that we give up and let the caller decide.
export async function pollUntilReady(
  contractId: string,
  getAccessToken: () => Promise<string | null>,
  options: PollOptions = {},
): Promise<StatusResponse> {
  const start = Date.now();
  const HARD_TIMEOUT_MS = 5 * 60 * 1000;
  let elapsed = 0;

  while (elapsed < HARD_TIMEOUT_MS) {
    if (options.signal?.aborted) {
      throw new ApiError(0, "aborted", "Polling cancelled.");
    }

    const token = await getAccessToken();
    if (!token) throw new ApiError(401, "unauthorized", "Session expired.");

    const status = await getStatus(contractId, token);
    options.onTick?.(status);

    if (status.status === "ready" || status.status === "failed") {
      return status;
    }

    elapsed = Date.now() - start;
    const interval = elapsed < 30_000 ? 2_000 : 5_000;
    await sleep(interval, options.signal);
  }

  throw new ApiError(
    0,
    "timeout",
    "Analysis is taking longer than expected. Refresh to retry.",
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError(0, "aborted", "Polling cancelled."));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new ApiError(0, "aborted", "Polling cancelled."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
