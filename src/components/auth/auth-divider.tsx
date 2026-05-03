export function AuthDivider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-ink-800" />
      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{label}</span>
      <span className="h-px flex-1 bg-ink-800" />
    </div>
  );
}
