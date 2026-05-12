import { AddinSignInButtons } from "./sign-in-buttons";

export default function AddinAuthPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <div
          className="font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight"
          aria-hidden="true"
        >
          <span className="text-brand-400">§</span>{" "}
          <span className="text-ink-100">Clauseium</span>
        </div>
        <h1 className="text-[20px] font-semibold text-ink-100">
          Sign in to your Word add-in
        </h1>
        <p className="text-[13px] leading-relaxed text-ink-400">
          Connect this Word session to Clauseium to review the open document.
        </p>
      </header>

      <AddinSignInButtons />

      <footer className="space-y-3 pt-2 text-center text-[11px] leading-relaxed text-ink-500">
        <p>
          By signing in you agree that Clauseium may store the uploaded document
          for up to 30 days for review purposes. You can request earlier deletion
          any time.
        </p>
        <p className="text-ink-600">
          Clauseium provides legal information, not legal advice.
        </p>
      </footer>
    </div>
  );
}
