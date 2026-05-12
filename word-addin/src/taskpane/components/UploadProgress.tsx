import { AlertCircle, FileText, Loader2, RefreshCw } from "lucide-react";
import type { FlowKind, FlowState } from "@addin/state/contract-store";

// Progress UI for every state the Workspace can be in except `ready`
// (which renders the actual analysis) and `consent_needed` (which renders
// the ConsentDialog overlay instead).
//
// Each non-terminal step shows a spinner + a short caption. The error
// state shows a Retry button when the error is recoverable.

interface UploadProgressProps {
  state: FlowState;
  onRetry: () => void;
  onSignOut: () => void;
}

export function UploadProgress({ state, onRetry, onSignOut }: UploadProgressProps) {
  if (state.kind === "error") {
    return (
      <ErrorView
        code={state.errorCode ?? "unknown"}
        message={state.errorMessage ?? "Something went wrong."}
        recoverable={state.recoverable}
        onRetry={onRetry}
        onSignOut={onSignOut}
      />
    );
  }

  const caption = CAPTIONS[state.kind] ?? "Working…";
  const sub = subline(state);

  return (
    <div className="flex flex-col items-center justify-center text-center px-5 py-12">
      <div className="mb-4 rounded-full bg-ink-800/60 p-3">
        {state.kind === "reading" ? (
          <FileText className="h-5 w-5 text-ink-300" />
        ) : (
          <Loader2 className="h-5 w-5 text-brand-400 animate-spin" />
        )}
      </div>
      <h2 className="text-[14px] font-semibold text-ink-100 mb-1">{caption}</h2>
      {sub ? (
        <p className="text-[12px] text-ink-400 leading-relaxed max-w-[260px]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

const CAPTIONS: Record<FlowKind, string> = {
  idle: "Preparing review…",
  reading: "Reading your document…",
  checking_hash: "Checking for existing analysis…",
  consent_needed: "Awaiting your consent…",
  uploading: "Uploading to Clauseium…",
  queued: "Queued for analysis…",
  processing: "Analyzing clauses…",
  fetching_analysis: "Fetching results…",
  ready: "",
  error: "",
};

function subline(state: FlowState): string | null {
  switch (state.kind) {
    case "reading":
      return "Streaming the .docx from Word.";
    case "checking_hash":
      return "Skipping re-upload if we've seen this file before.";
    case "uploading":
      if (state.bytes != null) {
        return `Uploading ${formatBytes(state.bytes)}.`;
      }
      return "Sending the document to Clauseium.";
    case "queued":
      return "Waiting for the analyzer to pick it up.";
    case "processing":
      return "Parsing clauses, classifying, and verifying citations. Usually 30-90 seconds.";
    case "fetching_analysis":
      return "Almost done.";
    default:
      return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ErrorView({
  code,
  message,
  recoverable,
  onRetry,
  onSignOut,
}: {
  code: string;
  message: string;
  recoverable: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-5 py-10">
      <div className="mb-4 rounded-full bg-risk-high/15 p-3">
        <AlertCircle className="h-5 w-5 text-risk-high" />
      </div>
      <h2 className="text-[14px] font-semibold text-ink-100 mb-1">
        {ERROR_TITLES[code] ?? "Couldn't analyze this document"}
      </h2>
      <p className="text-[12px] text-ink-400 leading-relaxed max-w-[280px] mb-4">
        {message}
      </p>
      <div className="flex items-center gap-2">
        {recoverable && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="text-[12px] text-ink-400 hover:text-ink-200 px-2 py-1.5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

const ERROR_TITLES: Record<string, string> = {
  office_unavailable: "Open this in Microsoft Word",
  document_unsaved: "Save the document first",
  document_empty: "This document is empty",
  too_large: "Document is too large",
  unauthorized: "Session expired",
  consent_declined: "Consent required",
  processing_failed: "Analysis failed",
};
