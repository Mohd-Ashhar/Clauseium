import { AddinSignInButtons } from "./sign-in-buttons";
import type { AddinOAuthProvider } from "./actions";

// The add-in opens this page at /addin-auth?provider=google|azure. Normalise it
// (tolerating "microsoft" → "azure") so the matching OAuth flow auto-starts.
function normalizeProvider(
  raw: string | string[] | undefined,
): AddinOAuthProvider | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "google") return "google";
  if (v === "azure" || v === "microsoft") return "azure";
  return undefined;
}

export default function AddinAuthPage({
  searchParams,
}: {
  searchParams?: { provider?: string | string[] };
}) {
  const autoProvider = normalizeProvider(searchParams?.provider);
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <div
          className="font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight"
          aria-hidden="true"
        >
          <span className="text-counsel-400">§</span>{" "}
          <span className="text-ink-100">Clauseium</span>
        </div>
        <h1 className="text-[20px] font-semibold text-ink-100">
          Sign in to your Word add-in
        </h1>
        <p className="text-[13px] leading-relaxed text-ink-400">
          Connect this Word session to Clauseium to review the open document.
        </p>
      </header>

      <AddinSignInButtons autoProvider={autoProvider} />

      <footer className="space-y-3 pt-2 text-center text-[11px] leading-relaxed text-ink-500">
        <p>
          By signing in you agree that Clauseium may store the uploaded document
          for up to 30 days for review purposes. You can request earlier deletion
          any time.
        </p>
        <p className="text-ink-600">
          Clauseium provides legal information and analysis — not a substitute for professional judgement.
        </p>
      </footer>
    </div>
  );
}
