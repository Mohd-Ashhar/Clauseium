import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12">
      {icon && <div className="mb-3 text-ink-500">{icon}</div>}
      <h2 className="text-[14px] font-semibold text-ink-100 mb-1">{title}</h2>
      <p className="text-[12.5px] text-ink-400 leading-relaxed max-w-[280px] mb-4">
        {body}
      </p>
      {action}
    </div>
  );
}
