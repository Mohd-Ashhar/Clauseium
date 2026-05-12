// Token persistence. Per the plan we use localStorage (machine-local,
// browser-isolated) and NOT Office.context.roamingSettings (Microsoft-
// roamed across the user's M365 tenant). Storing tokens in roamingSettings
// would put them on Microsoft's infra — for DPDP posture we keep them
// machine-local.

import { TOKEN_STORAGE_KEY } from "@addin/config";
import type { AuthTokens } from "@addin/types/contract";

export function loadTokens(): AuthTokens | null {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthTokens>;
    if (
      typeof parsed.access_token !== "string" ||
      typeof parsed.refresh_token !== "string"
    ) {
      return null;
    }
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: typeof parsed.expires_at === "number" ? parsed.expires_at : null,
      token_type: typeof parsed.token_type === "string" ? parsed.token_type : "bearer",
    };
  } catch {
    return null;
  }
}

export function saveTokens(tokens: AuthTokens): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Storage quota / private mode — non-fatal. The user just won't stay
    // signed in across reloads.
  }
}

export function clearTokens(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Returns true when the access token will expire within `withinSeconds` and
// we should preemptively refresh before the next API call. expires_at is
// epoch seconds; we leave 60s of headroom by default.
export function isAccessTokenExpiring(
  tokens: AuthTokens,
  withinSeconds = 60,
): boolean {
  if (tokens.expires_at == null) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return tokens.expires_at - nowSec <= withinSeconds;
}
