"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, FileText, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useReview } from "./review-context";

type ExportFormat = "redlined" | "clean" | "summary" | "full";

const formats: { id: ExportFormat; label: string; description: string }[] = [
  {
    id: "redlined",
    label: "Redlined Word doc",
    description: "Tracked changes with all suggested redlines",
  },
  {
    id: "clean",
    label: "Clean Word doc",
    description: "Accepted changes merged, ready to send",
  },
  {
    id: "summary",
    label: "Risk summary PDF",
    description: "1-page executive overview with citations",
  },
  {
    id: "full",
    label: "Full analysis report",
    description: "Detailed clause-by-clause review",
  },
];

export function ExportDialog() {
  const { exportOpen, setExportOpen, toast } = useReview();
  const [format, setFormat] = useState<ExportFormat>("redlined");
  const [includeReasoning, setIncludeReasoning] = useState(true);

  const handleExport = () => {
    toast("Export feature coming soon — this is a preview", "info");
    setExportOpen(false);
  };

  return (
    <DialogPrimitive.Root open={exportOpen} onOpenChange={setExportOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[80] bg-ink-950/70 backdrop-blur-sm",
            "data-[state=closed]:animate-[fade-out_0.2s] data-[state=open]:animate-[fade-in_0.2s]",
          )}
        />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[81] -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl p-6 focus:outline-none">
          <div className="flex items-start justify-between mb-4">
            <div>
              <DialogPrimitive.Title className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink-100">
                Export redlined contract
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-[13px] text-ink-500 mt-1">
                Choose a format. Your redlines and analysis will be packaged accordingly.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="h-7 w-7 inline-flex items-center justify-center rounded text-ink-500 hover:text-ink-100 hover:bg-ink-850 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="space-y-2">
            {formats.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  format === f.id
                    ? "border-brand-500/50 bg-brand-500/5"
                    : "border-ink-700 hover:border-ink-500 bg-ink-850",
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
                    format === f.id ? "border-brand-500 bg-brand-500" : "border-ink-700",
                  )}
                >
                  {format === f.id && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-ink-500" />
                    <span className="text-[13.5px] font-medium text-ink-100">
                      {f.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-500 mt-0.5">{f.description}</p>
                </div>
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeReasoning}
              onChange={(e) => setIncludeReasoning(e.target.checked)}
              className="h-4 w-4 rounded border-ink-700 bg-ink-850 accent-brand-500 cursor-pointer"
            />
            <span className="text-[13px] text-ink-300 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-brand-400" />
              Include AI reasoning in comments
            </span>
          </label>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setExportOpen(false)}
              className="px-4 py-2 text-[13px] text-ink-300 hover:text-ink-100 hover:bg-ink-850 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-[13px] font-medium bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              Export
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
