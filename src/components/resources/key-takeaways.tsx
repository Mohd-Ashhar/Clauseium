import { Children, isValidElement } from "react";
import { Sparkles } from "lucide-react";

export function KeyTakeaways({
  children,
}: {
  children?: React.ReactNode;
}) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <aside
      className="key-takeaways not-prose my-10 rounded-2xl border border-counsel-200 bg-counsel-50 p-6 md:p-7"
      aria-label="Key takeaways"
    >
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-counsel-600">
        <Sparkles className="h-3.5 w-3.5" />
        Key takeaways
      </div>
      <ol className="mt-4 space-y-3">
        {items.map((child, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[15px] leading-[1.6] text-paper-900/90"
          >
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-counsel-500 font-mono text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">{child}</div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function Takeaway({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
