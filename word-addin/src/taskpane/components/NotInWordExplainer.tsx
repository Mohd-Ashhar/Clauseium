import { ExternalLink, FileText } from "lucide-react";
import { APP_ORIGIN } from "@addin/config";

// Shown when the taskpane URL is opened outside Microsoft Word — most
// commonly when:
//   - A reviewer visits https://localhost:3001/taskpane.html in a browser
//     for visual smoke testing
//   - Someone tries to launch the add-in inside macOS Pages (Pages can't
//     host Office add-ins at all; Office.js never reports a host)
//   - The user accidentally sideloads into Excel / PowerPoint
//
// We gate this on `officeReady().isOfficeHost === false`. Inside Word the
// task pane never sees this component; Shell renders normally.

interface NotInWordExplainerProps {
  host: string | null;
  platform: string | null;
}

export function NotInWordExplainer({ host, platform }: NotInWordExplainerProps) {
  const detected = host
    ? `Detected host: ${host}${platform ? ` (${platform})` : ""}`
    : "Detected host: not an Office app";

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="mb-4 rounded-full bg-brand-500/15 p-3">
        <FileText className="h-5 w-5 text-brand-400" aria-hidden="true" />
      </div>
      <div
        className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-tight mb-1"
        aria-hidden="true"
      >
        <span className="text-brand-400">§</span>{" "}
        <span className="text-ink-100">Clauseium</span>
      </div>
      <h1 className="text-[15px] font-semibold text-ink-100 mb-2">
        Open this in Microsoft Word.
      </h1>
      <p className="text-[12.5px] text-ink-400 leading-relaxed max-w-[300px] mb-5">
        This add-in runs inside the Word task pane. Open your contract in
        Microsoft Word (not Pages or another editor), then click the
        Clauseium ribbon button to launch this panel.
      </p>
      <a
        href={APP_ORIGIN}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-brand-400 hover:text-brand-300 transition-colors"
      >
        Open Clauseium in browser
        <ExternalLink className="h-3 w-3" />
      </a>
      <p className="text-[10.5px] text-ink-500 mt-6 font-[family-name:var(--font-mono)]">
        {detected}
      </p>
    </div>
  );
}
