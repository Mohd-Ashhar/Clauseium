import { Children, isValidElement } from "react";

type Status = "done" | "active" | "upcoming";

const STATUS_STYLES: Record<Status, string> = {
  done: "border-paper-300 bg-paper-100 text-paper-600",
  active: "border-brand-500 bg-brand-500 text-white",
  upcoming: "border-paper-300 bg-white text-paper-500",
};

const STATUS_LABEL: Record<Status, string> = {
  done: "Completed",
  active: "In effect",
  upcoming: "Upcoming",
};

const STATUS_PILL: Record<Status, string> = {
  done: "bg-paper-200 text-paper-600",
  active: "bg-brand-500/10 text-brand-600",
  upcoming: "bg-counsel-500/10 text-counsel-600",
};

function isStatus(value: string | undefined): value is Status {
  return value === "done" || value === "active" || value === "upcoming";
}

export function DpdpTimeline({ children }: { children?: React.ReactNode }) {
  return (
    <ol className="not-prose my-10 space-y-0 border-l border-paper-200 pl-6">
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return null;
        return child;
      })}
    </ol>
  );
}

export function DpdpEvent({
  date,
  label,
  status,
  children,
}: {
  date?: string;
  label?: string;
  status?: string;
  children?: React.ReactNode;
}) {
  const safeStatus: Status = isStatus(status) ? status : "upcoming";

  return (
    <li className="relative pb-8 last:pb-0">
      <span
        className={`absolute -left-[33px] top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${STATUS_STYLES[safeStatus]}`}
        aria-label={STATUS_LABEL[safeStatus]}
      >
        {safeStatus === "active" && (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        )}
      </span>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          {date && (
            <time className="font-mono text-[12px] uppercase tracking-[0.14em] text-paper-500">
              {date}
            </time>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_PILL[safeStatus]}`}
          >
            {STATUS_LABEL[safeStatus]}
          </span>
        </div>
        {label && (
          <h4 className="font-display text-[17px] font-semibold text-paper-900">
            {label}
          </h4>
        )}
        {children && (
          <div className="text-[14.5px] leading-relaxed text-paper-700">
            {children}
          </div>
        )}
      </div>
    </li>
  );
}
