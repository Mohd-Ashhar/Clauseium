import { AlertOctagon, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

// Top-level error boundary for the add-in. Catches render-time crashes
// anywhere below it (Workspace, ChatDrawer, etc.) and renders a recovery
// UI inside the task pane so the user isn't left staring at a blank panel.
//
// React 19 still requires a class for getDerivedStateFromError; there's
// no functional equivalent today. Kept tiny on purpose.
//
// Recovery actions:
//   - Reload: window.location.reload(). Tokens in localStorage persist, so
//     the user lands back in Workspace without re-signing in.
//   - Sign out: clear add-in localStorage keys + reload. Useful when the
//     crash is caused by a corrupted token, consent flag, or stale state.

const STORAGE_KEYS_TO_CLEAR = [
  "clauseium.addin.tokens.v1",
  "clauseium.addin.consent.v1",
  "clauseium.addin.track-changes-consent.v1",
];

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Structured single-line log so it's spottable in Office DevTools.
    console.error(
      `[addin] crash ${error.name}: ${error.message}`,
      info.componentStack,
    );
  }

  reload = () => {
    window.location.reload();
  };

  signOutAndReload = () => {
    try {
      for (const key of STORAGE_KEYS_TO_CLEAR) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable — fall through to reload anyway.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <CrashView error={this.state.error} onReload={this.reload} onSignOut={this.signOutAndReload} />;
  }
}

function CrashView({
  error,
  onReload,
  onSignOut,
}: {
  error: Error | null;
  onReload: () => void;
  onSignOut: () => void;
}) {
  const stackLines = (error?.stack ?? "")
    .split("\n")
    .slice(0, 8)
    .join("\n");

  return (
    <div className="h-screen flex flex-col items-center justify-center px-5 py-6 text-center">
      <div className="mb-4 rounded-full bg-risk-high/15 p-3">
        <AlertOctagon className="h-5 w-5 text-risk-high" aria-hidden="true" />
      </div>
      <h1 className="text-[15px] font-semibold text-ink-100 mb-1">
        Something went wrong.
      </h1>
      <p className="text-[12.5px] text-ink-400 leading-relaxed max-w-[280px] mb-5">
        Clauseium hit an unexpected error. Reload the add-in to recover —
        your sign-in is preserved.
      </p>
      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-medium px-3.5 py-2 rounded-md transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Reload
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="text-[12.5px] text-ink-400 hover:text-ink-200 px-2.5 py-2 transition-colors"
        >
          Sign out
        </button>
      </div>
      {error && (
        <details className="w-full max-w-[320px] text-left">
          <summary className="cursor-pointer text-[11px] text-ink-500 hover:text-ink-300 inline-flex items-center gap-1">
            Show technical details
          </summary>
          <pre className="mt-2 rounded bg-ink-950/70 border border-ink-800 p-2 text-[10.5px] text-ink-400 font-[family-name:var(--font-mono)] whitespace-pre-wrap break-all max-h-[160px] overflow-auto">
            {error.name}: {error.message}
            {stackLines && "\n\n" + stackLines}
          </pre>
        </details>
      )}
    </div>
  );
}
