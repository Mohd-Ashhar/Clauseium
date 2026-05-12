// Always-visible footer. Per /CLAUDE.md and AppSource submission guidance,
// every Clauseium UI surface must surface the "legal information, not legal
// advice" disclaimer at least once. The task pane is narrow so we keep it
// to a single short line.

export function LegalFooter() {
  return (
    <footer className="px-3 py-2 border-t border-ink-800 text-[10px] leading-relaxed text-ink-500 text-center">
      Clauseium provides legal information, not legal advice.
    </footer>
  );
}
