"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowRight,
  ChevronRight,
  Download,
  Search,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  contractTypeFullLabel,
  formatShortDate,
  timeAgo,
} from "@/lib/format";
import type { Contract, ReviewStatus } from "@/types/contract";
import { RiskBadge } from "./risk-badge";
import { StatusBadge } from "./status-badge";

type FilterId = "all" | "needs_you" | "high" | "in_progress";

const teamColors: Record<string, string> = {
  "Priya Menon": "bg-brand-500",
  "Arjun Subramanian": "bg-counsel-500",
  "Nidhi Kapoor": "bg-risk-info",
  "Ravi Shankar": "bg-risk-low",
  "Divya Iyer": "bg-risk-med",
  "Karan Malhotra": "bg-brand-600",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function firstName(full: string) {
  return full.split(" ")[0];
}

// Urgency rank for default sort. Lower = more urgent (sorts first).
function urgencyBucket(c: Contract): number {
  if (c.status === "needs_attention") return 0;
  if (c.status === "reviewed" && c.riskSummary.high > 0) return 1;
  if (c.status === "in_progress") return 2;
  if (c.status === "pending") return 3;
  return 4; // approved, sent_back
}

function riskRank(c: Contract): number {
  return c.riskSummary.high * 100 + c.riskSummary.medium * 10 + c.riskSummary.low;
}

function urgencySort(a: Contract, b: Contract): number {
  const bucketDiff = urgencyBucket(a) - urgencyBucket(b);
  if (bucketDiff !== 0) return bucketDiff;
  const riskDiff = riskRank(b) - riskRank(a); // higher risk first
  if (riskDiff !== 0) return riskDiff;
  return b.lastUpdated.getTime() - a.lastUpdated.getTime(); // most recent first
}

function topRiskLevel(c: Contract): { level: "high" | "medium" | "standard"; count: number } {
  if (c.riskSummary.high > 0) return { level: "high", count: c.riskSummary.high };
  if (c.riskSummary.medium > 0) return { level: "medium", count: c.riskSummary.medium };
  return { level: "standard", count: 0 };
}

const tableStatuses: ReviewStatus[] = ["needs_attention", "in_progress", "reviewed", "pending"];

export function ContractTable({
  contracts,
  initialFilter = "all",
}: {
  contracts: Contract[];
  initialFilter?: FilterId;
}) {
  const [filter, setFilter] = useState<FilterId>(initialFilter);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Active contracts only — completed/sent-back contracts move to a future "Completed" tab.
  const active = useMemo(
    () => contracts.filter((c) => tableStatuses.includes(c.status)),
    [contracts],
  );

  const inProgressCount = active.filter((c) => c.status === "in_progress").length;

  const visibleFilters = useMemo(() => {
    const base: { id: FilterId; label: string }[] = [
      { id: "all", label: "All" },
      { id: "needs_you", label: "Needs you" },
      { id: "high", label: "High risk" },
    ];
    if (inProgressCount >= 2) base.push({ id: "in_progress", label: "In progress" });
    return base;
  }, [inProgressCount]);

  const filtered = useMemo(() => {
    let list = active;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || c.counterparty.toLowerCase().includes(q),
      );
    }
    switch (filter) {
      case "needs_you":
        list = list.filter((c) => c.status === "needs_attention");
        break;
      case "high":
        list = list.filter((c) => c.riskSummary.high > 0);
        break;
      case "in_progress":
        list = list.filter((c) => c.status === "in_progress");
        break;
    }
    return [...list].sort(urgencySort);
  }, [active, filter, query]);

  return (
    <div id="contract-queue" className="space-y-3 scroll-mt-20">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-100">Your contracts</h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter contracts…"
              className="w-full bg-ink-850 border border-ink-700 hover:border-ink-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 rounded-lg pl-8 pr-2.5 py-1.5 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto dark-scrollbar">
            {visibleFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full transition-colors whitespace-nowrap",
                  filter === f.id
                    ? "bg-brand-500/15 text-brand-200"
                    : "bg-ink-850 text-ink-500 hover:text-ink-300",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table container */}
      <div className="bg-ink-850 border border-ink-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto dark-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-ink-900 border-b border-ink-700">
              <tr className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
                <th className="w-8 px-2" />
                <th className="px-4 py-3 font-medium" style={{ width: "45%" }}>
                  Contract
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: "20%" }}>
                  Risk
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: "20%" }}>
                  Status
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: "15%" }}>
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink-500">
                    No contracts match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => {
                const risk = topRiskLevel(c);
                const isOpen = expanded === c.id;
                const isLast = i === filtered.length - 1;
                return (
                  <ExpandableRow
                    key={c.id}
                    contract={c}
                    risk={risk}
                    isOpen={isOpen}
                    isLast={isLast}
                    onToggle={() => setExpanded(isOpen ? null : c.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="bg-ink-900 border-t border-ink-700 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-500">
            Showing {filtered.length} of {active.length} active contracts
          </span>
          <div className="flex items-center gap-2">
            <button
              className="h-7 px-2.5 text-[12px] text-ink-300 hover:text-ink-100 hover:bg-ink-800 rounded disabled:opacity-50"
              disabled
            >
              Previous
            </button>
            <span className="text-[12px] text-ink-500 font-[family-name:var(--font-mono)]">
              Page 1 of 1
            </span>
            <button
              className="h-7 px-2.5 text-[12px] text-ink-300 hover:text-ink-100 hover:bg-ink-800 rounded disabled:opacity-50"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandableRow({
  contract: c,
  risk,
  isOpen,
  isLast,
  onToggle,
}: {
  contract: Contract;
  risk: { level: "high" | "medium" | "standard"; count: number };
  isOpen: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "hover:bg-ink-800/60 transition-colors group cursor-pointer",
          !isLast && !isOpen && "border-b border-ink-700/50",
        )}
        onClick={onToggle}
      >
        <td className="w-8 px-2 align-middle">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-ink-500 transition-transform",
              isOpen && "rotate-90 text-ink-300",
            )}
          />
        </td>
        <td className="px-4 py-3 align-middle min-w-0">
          <div className="text-[13.5px] font-medium text-ink-100 truncate group-hover:text-brand-300 transition-colors">
            {c.title}
          </div>
          <div className="text-[12px] text-ink-500 truncate">{c.counterparty}</div>
        </td>
        <td className="px-4 py-3 align-middle">
          {risk.level === "high" ? (
            <RiskBadge level="high" count={risk.count} />
          ) : risk.level === "medium" ? (
            <RiskBadge level="medium" count={risk.count} />
          ) : (
            <RiskBadge level="standard" />
          )}
        </td>
        <td className="px-4 py-3 align-middle">
          <StatusBadge status={c.status} />
        </td>
        <td className="px-4 py-3 align-middle">
          {c.assignedTo ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold text-white",
                  teamColors[c.assignedTo] ?? "bg-ink-700",
                )}
              >
                {initials(c.assignedTo)}
              </span>
              <span className="text-[13px] text-ink-300 truncate">{firstName(c.assignedTo)}</span>
            </div>
          ) : (
            <button
              className="text-[13px] text-brand-400 hover:text-brand-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Assign
            </button>
          )}
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {isOpen && (
          <tr className={cn(!isLast && "border-b border-ink-700/50")}>
            <td colSpan={5} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <ExpandedDetail contract={c} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function ExpandedDetail({ contract: c }: { contract: Contract }) {
  return (
    <div className="bg-ink-900 border-t border-ink-700/50 px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
        <Meta label="Type" value={contractTypeFullLabel(c.contractType)} />
        <Meta label="Jurisdiction" value={c.jurisdiction} />
        <Meta label="Uploaded" value={formatShortDate(c.uploadedAt)} />
        <Meta label="Updated" value={timeAgo(c.lastUpdated)} />
        <Meta label="Pages" value={`${c.pageCount}`} />
        <Meta label="Size" value={c.fileSize} />
        <Meta label="Version" value={`v${c.version}`} />
        <Meta label="Uploaded by" value={c.uploadedBy} />
      </div>

      {c.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-ink-500">Tags</span>
          {c.tags.map((tag) => (
            <span
              key={tag}
              className="bg-ink-800 text-ink-400 text-xs px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-[11px] uppercase tracking-wider text-ink-500">Risk breakdown</span>
        <div className="flex items-center flex-wrap gap-2">
          {c.riskSummary.high > 0 && <RiskBadge level="high" count={c.riskSummary.high} />}
          {c.riskSummary.medium > 0 && <RiskBadge level="medium" count={c.riskSummary.medium} />}
          {c.riskSummary.standard > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-risk-low/15 text-risk-low">
              {c.riskSummary.standard} Standard
            </span>
          )}
          {c.riskSummary.missing > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-risk-info/15 text-risk-info">
              {c.riskSummary.missing} Missing
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/dashboard/contracts/${c.id}`}
          className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Open review
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-sm px-3 py-1.5 rounded-lg transition-colors">
          <UserPlus className="h-3.5 w-3.5" />
          Assign
        </button>
        <button className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-sm px-3 py-1.5 rounded-lg transition-colors">
          <Download className="h-3.5 w-3.5" />
          Download original
        </button>
        <button className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-sm px-3 py-1.5 rounded-lg transition-colors">
          <Archive className="h-3.5 w-3.5" />
          Archive
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] uppercase tracking-wider text-ink-500">{label}</span>
      <span className="text-ink-300 truncate">{value}</span>
    </div>
  );
}
