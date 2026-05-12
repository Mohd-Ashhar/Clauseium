import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { openAuthDialog, type AuthProvider } from "@addin/office/auth-dialog";
import { refreshAccessToken } from "@addin/api/client";
import {
  clearTokens,
  isAccessTokenExpiring,
  loadTokens,
  saveTokens,
} from "./persistence";
import type { AuthTokens } from "@addin/types/contract";

interface AuthContextValue {
  tokens: AuthTokens | null;
  isSignedIn: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  signIn: (provider: AuthProvider) => Promise<void>;
  signOut: () => void;
  // Returns a valid (non-expiring) access token, refreshing in the
  // background if needed. The API client uses this for every request.
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => loadTokens());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const signIn = useCallback(async (provider: AuthProvider) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const next = await openAuthDialog(provider);
      saveTokens(next);
      setTokens(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed unexpectedly";
      setAuthError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(() => {
    clearTokens();
    setTokens(null);
    setAuthError(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    if (!tokens) return null;
    if (!isAccessTokenExpiring(tokens)) {
      return tokens.access_token;
    }
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      saveTokens(refreshed);
      setTokens(refreshed);
      return refreshed.access_token;
    } catch {
      // Refresh failed — Supabase rejected the token (rotated, revoked,
      // expired). Sign the user out and surface the SignedOut route.
      clearTokens();
      setTokens(null);
      return null;
    }
  }, [tokens]);

  // If localStorage tokens are restored from a previous session and are
  // already past expiry, refresh them once on mount so the first API call
  // doesn't need to handle the 401 path.
  useEffect(() => {
    if (tokens && isAccessTokenExpiring(tokens, 0)) {
      void getAccessToken();
    }
    // intentionally only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      tokens,
      isSignedIn: tokens != null,
      isAuthenticating,
      authError,
      signIn,
      signOut,
      getAccessToken,
    }),
    [tokens, isAuthenticating, authError, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
