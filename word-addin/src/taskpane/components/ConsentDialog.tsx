import { ShieldCheck } from "lucide-react";

// One-time DPDP consent gate. Shown when the user is about to upload a
// document Clauseium has never seen before. Decision is persisted in
// localStorage (clauseium.addin.consent.v1) by the contract store so we
// never re-prompt on the same machine.
//
// Content mirrors the disclosure on the SignedOut screen but appears
// here as a deliberate "I am about to upload" moment, per DPDP Act §6
// (notice + consent before processing). User can decline → flow halts.

interface ConsentDialogProps {
  filename: string | null;
  bytes: number | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentDialog({
  filename,
  bytes,
  onAccept,
  onDecline,
}: ConsentDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="absolute inset-0 z-20 bg-ink-950/95 backdrop-blur-sm flex items-center justify-center px-5 py-6"
    >
      <div className="w-full max-w-[320px] bg-ink-900 border border-ink-700 rounded-xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3 text-counsel-500">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[11px] uppercase tracking-wider font-medium">
            One-time consent
          </span>
        </div>
        <h2
          id="consent-title"
          className="text-[15px] font-semibold text-ink-100 mb-2"
        >
          Upload this document to Clauseium for review?
        </h2>
        <p className="text-[12.5px] text-ink-300 leading-relaxed mb-3">
          Clauseium will analyze the document and store it for up to 30 days
          for review purposes. You can request earlier deletion any time.
        </p>
        {filename ? (
          <div className="mb-4 rounded-md bg-ink-950/60 border border-ink-700/60 px-3 py-2 text-[11.5px]">
            <div className="text-ink-200 truncate font-medium">{filename}</div>
            {bytes != null ? (
              <div className="text-ink-500 mt-0.5">{formatBytes(bytes)}</div>
            ) : null}
          </div>
        ) : null}
        <ul className="text-[11.5px] text-ink-400 leading-relaxed space-y-1.5 mb-5">
          <li className="flex items-baseline gap-1.5">
            <span className="h-1 w-1 rounded-full bg-brand-400 mt-1.5 shrink-0" />
            Tokens are stored locally on this machine, not on Microsoft's servers.
          </li>
          <li className="flex items-baseline gap-1.5">
            <span className="h-1 w-1 rounded-full bg-brand-400 mt-1.5 shrink-0" />
            Zero data retention with our LLM providers.
          </li>
          <li className="flex items-baseline gap-1.5">
            <span className="h-1 w-1 rounded-full bg-brand-400 mt-1.5 shrink-0" />
            Clauseium provides legal information, not legal advice.
          </li>
        </ul>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-medium px-3 py-2 rounded-lg transition-colors"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="text-[12.5px] text-ink-400 hover:text-ink-200 px-3 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
