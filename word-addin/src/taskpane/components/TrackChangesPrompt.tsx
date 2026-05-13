import { Check, Clipboard, GitPullRequestArrow, X } from "lucide-react";

// One-time prompt shown when the user accepts their first redline. The
// decision (apply as tracked change vs. clipboard-only) is persisted in
// localStorage so subsequent Accept clicks don't re-prompt on this machine.
//
// Cancel here aborts the redline application entirely; the clause stays
// "pending". The other two options both result in the clause flipping to
// "accepted" but differ in how the suggestion lands in Word:
//   - accepted        → range.insertText("Replace") under TrackAll mode
//   - clipboard_only  → navigator.clipboard.writeText, user pastes
//                       manually wherever they want

interface TrackChangesPromptProps {
  clauseLabel: string;
  onAccept: () => void;
  onClipboardOnly: () => void;
  onCancel: () => void;
}

export function TrackChangesPrompt({
  clauseLabel,
  onAccept,
  onClipboardOnly,
  onCancel,
}: TrackChangesPromptProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-changes-title"
      className="absolute inset-0 z-30 bg-ink-950/95 backdrop-blur-sm flex items-center justify-center px-5 py-6"
    >
      <div className="w-full max-w-[320px] bg-ink-900 border border-ink-700 rounded-xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3 text-brand-400">
          <GitPullRequestArrow className="h-4 w-4" />
          <span className="text-[11px] uppercase tracking-wider font-medium">
            One-time choice
          </span>
        </div>
        <h2
          id="track-changes-title"
          className="text-[15px] font-semibold text-ink-100 mb-2"
        >
          Apply redline as a tracked change?
        </h2>
        <p className="text-[12.5px] text-ink-300 leading-relaxed mb-2">
          Clauseium will turn on Word's Track Changes for this document and
          replace {clauseLabel} with the suggested redline as a single
          revision you can accept or reject in Word's review pane.
        </p>
        <p className="text-[11px] text-ink-500 leading-relaxed mb-4">
          We'll remember your choice on this machine.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Apply as tracked change
          </button>
          <button
            type="button"
            onClick={onClipboardOnly}
            className="w-full inline-flex items-center justify-center gap-2 border border-ink-700 hover:border-ink-500 text-ink-200 hover:text-ink-100 text-[13px] font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Copy to clipboard instead
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full inline-flex items-center justify-center gap-2 text-ink-400 hover:text-ink-200 text-[12px] px-3 py-2 transition-colors"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
