import { ArrowRight } from "lucide-react";
import { activityFeed } from "@/lib/mock-data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ActivityFeed() {
  const items = activityFeed.slice(0, 4);
  return (
    <section className="bg-ink-850 border border-ink-700 rounded-xl">
      <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700/50">
        <h3 className="text-sm font-semibold text-ink-100">Recent activity</h3>
        <button className="inline-flex items-center gap-1 text-[13px] text-brand-400 hover:text-brand-300 transition-colors">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </header>
      <ul className="divide-y divide-ink-700/50">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            <div
              className={cn(
                "h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold text-white",
                item.user.color,
              )}
            >
              {item.user.initials}
            </div>
            <p className="flex-1 text-[13px] truncate min-w-0">
              <span className="text-ink-100 font-medium">{item.user.name}</span>{" "}
              <span className="text-ink-500">{item.action}</span>{" "}
              <span className="text-ink-300">{item.target}</span>
            </p>
            <span className="text-[12px] text-ink-500 shrink-0">{timeAgo(item.timestamp)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
