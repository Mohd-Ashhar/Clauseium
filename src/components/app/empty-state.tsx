import { FileText, Plus } from "lucide-react";
import { UploadButton } from "./upload-button";

export function EmptyState() {
  return (
    <div className="bg-ink-850 border border-ink-700 rounded-xl p-12 flex flex-col items-center text-center">
      <div className="h-20 w-20 rounded-full border border-dashed border-ink-700 flex items-center justify-center relative mb-5">
        <FileText className="h-8 w-8 text-ink-500" />
        <span className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full bg-brand-500 flex items-center justify-center">
          <Plus className="h-3.5 w-3.5 text-white" />
        </span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink-100 mb-1">
        No contracts yet
      </h3>
      <p className="text-sm text-ink-500 max-w-sm mb-6">
        Upload your first contract to see Clauseium in action.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <UploadButton />
      </div>
    </div>
  );
}
