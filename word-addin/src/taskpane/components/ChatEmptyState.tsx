import { ArrowRight, Sparkles } from "lucide-react";

// Shown inside the chat drawer when the message list is empty. Three
// suggested questions tailored to the in-house counsel use case. Clicking a
// suggestion auto-sends it as a user message — the drawer's onSuggestionClick
// handles the wiring.

const SUGGESTIONS = [
  "What are the top three risks in this contract?",
  "Does this agreement comply with the DPDP Act 2023?",
  "Which clauses should I push back on?",
];

export function ChatEmptyState({
  onSuggestionClick,
  disabled,
}: {
  onSuggestionClick: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center px-3 py-6">
      <div className="mb-3 rounded-full bg-brand-500/10 p-2">
        <Sparkles className="h-4 w-4 text-brand-400" />
      </div>
      <h3 className="text-[13px] font-semibold text-ink-100 mb-1">
        Ask anything about this contract
      </h3>
      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-[260px] mb-4">
        Answers ground in your playbook and verified Indian-law citations.
      </p>
      <ul className="w-full max-w-[280px] space-y-1.5">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSuggestionClick(s)}
              className="group w-full inline-flex items-center justify-between gap-2 text-left bg-ink-850 hover:bg-ink-800 border border-ink-700 hover:border-ink-500 rounded-lg px-2.5 py-2 text-[12px] text-ink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="line-clamp-2">{s}</span>
              <ArrowRight className="h-3 w-3 text-ink-500 group-hover:text-ink-300 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
