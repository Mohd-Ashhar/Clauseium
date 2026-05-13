// Bearer-authenticated fetch wrapper for calling the Clauseium API from
// inside the Word task pane.
//
// Three exports:
//   - apiFetch(path, init, accessToken)     : throws ApiError on non-2xx
//     (except 404). Right for JSON request/response endpoints.
//   - apiFetchRaw(path, init, accessToken)  : never throws on HTTP status —
//     caller inspects response.status itself. Used by the streaming chat
//     endpoint where we want fine-grained code mapping (401/409/429/503).
//   - refreshAccessToken(refreshToken)      : hits Supabase's REST token
//     endpoint directly. Used by the auth context to roll an expiring
//     access token without round-tripping the dialog.
//
// We deliberately don't use the @supabase/supabase-js client here — it
// pulls in too much SDK weight (broadcast channels, realtime, etc.) for
// a single refresh call. Plain fetch is enough.

import { APP_ORIGIN, SUPABASE_ANON_KEY, SUPABASE_URL } from "@addin/config";
import type { AuthTokens } from "@addin/types/contract";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${APP_ORIGIN}${path}`, {
    ...init,
    headers,
    // Don't send cookies. The add-in is cross-origin and always uses
    // Bearer; cookies would just trigger the existing supabase/middleware
    // cookie-refresh path on the server.
    credentials: "omit",
  });

  if (!response.ok && response.status !== 404) {
    // Try to decode an API error body. Falls back to a generic message.
    let code = "request_failed";
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.clone().json()) as {
        error?: string;
        message?: string;
      };
      if (typeof body.error === "string") code = body.error;
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Non-JSON body — keep the generic message.
    }

    // Surface 401 with a stable code the caller can match on.
    if (response.status === 401) {
      throw new ApiError(401, "unauthorized", message);
    }
    throw new ApiError(response.status, code, message);
  }

  return response;
}

// Like apiFetch but does NOT throw on non-2xx — returns the Response so the
// caller can branch on response.status. Used by streaming endpoints like
// /api/contracts/[id]/chat where we want to distinguish 401 / 409 / 429 /
// 503 in the UI without exception plumbing through the SSE reader loop.
export async function apiFetchRaw(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${APP_ORIGIN}${path}`, {
    ...init,
    headers,
    credentials: "omit",
  });
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<AuthTokens> {
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase REST requires the anon key on every request. The user's
      // refresh JWT goes in the body, not the header.
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "refresh_failed",
      `Token refresh failed: ${response.status}`,
    );
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    token_type?: string;
  };

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at ?? null,
    token_type: body.token_type ?? "bearer",
  };
}
