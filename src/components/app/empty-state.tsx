import { FileText, Plus } from "lucide-react";

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
        <button className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="h-4 w-4" />
          Upload a contract
        </button>
        <button className="inline-flex items-center text-sm text-ink-300 hover:text-ink-100 hover:bg-ink-800 px-4 py-2 rounded-lg transition-colors">
          Or try with a sample MSA
        </button>
      </div>
    </div>
  );
}
