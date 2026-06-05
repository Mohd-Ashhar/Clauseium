"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithOAuthForAddin, type AddinOAuthProvider } from "./actions";

export function AddinSignInButtons({
  autoProvider,
}: {
  // When the add-in opens the dialog at /addin-auth?provider=<p>, we start that
  // provider's OAuth immediately instead of making the user pick again (the
  // double-click bug). On failure we fall back to the buttons below.
  autoProvider?: AddinOAuthProvider;
}) {
  const [pending, setPending] = useState<AddinOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const start = useCallback(async (provider: AddinOAuthProvider) => {
    setError(null);
    setPending(provider);
    const result = await signInWithOAuthForAddin(provider);
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    setError(result.error);
    setPending(null);
  }, []);

  // Auto-start once when a provider is supplied in the URL. The ref guard ensures
  // a single attempt (no loop), and an error simply reveals the manual buttons.
  useEffect(() => {
    if (autoProvider && !autoStarted.current) {
      autoStarted.current = true;
      void start(autoProvider);
    }
  }, [autoProvider, start]);

  const onClick = start;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        size="md"
        className="w-full"
        onClick={() => onClick("google")}
        disabled={pending !== null}
      >
        {pending === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleMark className="h-4 w-4" />
        )}
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="md"
        className="w-full"
        onClick={() => onClick("azure")}
        disabled={pending !== null}
      >
        {pending === "azure" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MicrosoftMark className="h-4 w-4" />
        )}
        Continue with Microsoft
      </Button>

      {error ? (
        <p className="text-[12px] text-risk-high" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.63z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.45 1.35l2.58-2.58A8.96 8.96 0 0 0 9 0 9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
