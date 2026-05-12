import { Loader2 } from "lucide-react";
import { useState } from "react";
import { type AuthProvider } from "@addin/office/auth-dialog";
import { useAuth } from "@addin/state/auth-context";

export function SignedOut() {
  const { signIn } = useAuth();
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onClick(provider: AuthProvider) {
    setPending(provider);
    setLocalError(null);
    try {
      await signIn(provider);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[320px] space-y-6">
          <div className="text-center space-y-2">
            <div
              className="font-[family-name:var(--font-display)] text-[26px] font-bold tracking-tight"
              aria-hidden="true"
            >
              <span className="text-brand-400">§</span>{" "}
              <span className="text-ink-100">Clauseium</span>
            </div>
            <h1 className="text-[16px] font-semibold text-ink-100">
              Review this contract with AI
            </h1>
            <p className="text-[12.5px] leading-relaxed text-ink-400">
              Sign in to upload the open document and see clause-by-clause
              analysis here in the sidebar.
            </p>
          </div>

          <div className="space-y-2">
            <ProviderButton
              provider="google"
              label="Continue with Google"
              pending={pending === "google"}
              disabled={pending !== null}
              onClick={() => onClick("google")}
            />
            <ProviderButton
              provider="azure"
              label="Continue with Microsoft"
              pending={pending === "azure"}
              disabled={pending !== null}
              onClick={() => onClick("azure")}
            />
          </div>

          {localError && (
            <p
              role="alert"
              className="text-[11.5px] text-risk-high leading-relaxed text-center"
            >
              {localError}
            </p>
          )}

          <p className="text-[10.5px] leading-relaxed text-ink-500 text-center">
            By signing in you agree Clauseium may store the uploaded document
            for up to 30 days for review purposes. You can request earlier
            deletion any time.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderButton({
  provider,
  label,
  pending,
  disabled,
  onClick,
}: {
  provider: AuthProvider;
  label: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2.5 border border-ink-700 hover:border-ink-500 bg-ink-900 text-ink-100 text-[13px] font-medium px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : provider === "google" ? (
        <GoogleMark className="h-3.5 w-3.5" />
      ) : (
        <MicrosoftMark className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
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
