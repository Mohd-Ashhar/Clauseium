"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate, timeAgo } from "@/lib/format";
import type { DashboardContract, DashboardStatus } from "@/lib/dashboard-data";
import { RiskBadge } from "./risk-badge";
import { StatusBadge } from "./status-badge";

type FilterId = "all" | "needs_you" | "high" | "processing";

function urgencyBucket(c: DashboardContract): number {
  if (c.status === "needs_attention") return 0;
  if (c.status === "processing") return 1;
  if (c.status === "failed") return 2;
  return 3;
}

function riskRank(c: DashboardContract): number {
  return c.riskCounts.high * 100 + c.riskCounts.medium * 10 + c.riskCounts.low;
}

function urgencySort(a: DashboardContract, b: DashboardContract): number {
  const bucketDiff = urgencyBucket(a) - urgencyBucket(b);
  if (bucketDiff !== 0) return bucketDiff;
  const riskDiff = riskRank(b) - riskRank(a);
  if (riskDiff !== 0) return riskDiff;
  return b.uploadedAt.getTime() - a.uploadedAt.getTime();
}

function topRiskLevel(
  c: DashboardContract,
): { level: "high" | "medium" | "standard"; count: number } {
  if (c.riskCounts.high > 0) return { level: "high", count: c.riskCounts.high };
  if (c.riskCounts.medium > 0) return { level: "medium", count: c.riskCounts.medium };
  return { level: "standard", count: 0 };
}

function StatusCell({ status }: { status: DashboardStatus }) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-risk-info/15 text-risk-info">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-risk-high/15 text-risk-high">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

export function ContractTable({
  contracts,
  initialFilter = "all",
}: {
  contracts: DashboardContract[];
  initialFilter?: FilterId;
}) {
  const [filter, setFilter] = useState<FilterId>(initialFilter);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const processingCount = contracts.filter((c) => c.status === "processing").length;

  const visibleFilters = useMemo(() => {
    const base: { id: FilterId; label: string }[] = [
      { id: "all", label: "All" },
      { id: "needs_you", label: "Needs you" },
      { id: "high", label: "High risk" },
    ];
    if (processingCount > 0) base.push({ id: "processing", label: "Processing" });
    return base;
  }, [processingCount]);

  const filtered = useMemo(() => {
    let list = contracts;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.originalFilename.toLowerCase().includes(q),
      );
    }
    switch (filter) {
      case "needs_you":
        list = list.filter((c) => c.status === "needs_attention");
        break;
      case "high":
        list = list.filter((c) => c.riskCounts.high > 0);
        break;
      case "processing":
        list = list.filter((c) => c.status === "processing");
        break;
    }
    return [...list].sort(urgencySort);
  }, [contracts, filter, query]);

  return (
    <div id="contract-queue" className="space-y-3 scroll-mt-20">
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
              className="w-full bg-ink-850 border border-ink-700 hover:border-ink-500 focus:border-counsel-500 focus:outline-none focus:ring-1 focus:ring-counsel-500/30 rounded-lg pl-8 pr-2.5 py-1.5 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors"
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
                    ? "bg-counsel-500/15 text-counsel-200"
                    : "bg-ink-850 text-ink-500 hover:text-ink-300",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-ink-850 border border-ink-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto dark-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-ink-900 border-b border-ink-700">
              <tr className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
                <th className="w-8 px-2" />
                <th className="px-4 py-3 font-medium" style={{ width: "55%" }}>
                  Contract
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: "20%" }}>
                  Risk
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: "25%" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-500">
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

        <div className="bg-ink-900 border-t border-ink-700 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-500">
            Showing {filtered.length} of {contracts.length} contracts
          </span>
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
  contract: DashboardContract;
  risk: { level: "high" | "medium" | "standard"; count: number };
  isOpen: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  const reviewable = c.status === "needs_attention" || c.status === "reviewed";
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
          <div className="text-[13.5px] font-medium text-ink-100 truncate group-hover:text-counsel-300 transition-colors">
            {c.title}
          </div>
          <div className="text-[12px] text-ink-500 truncate">{c.originalFilename}</div>
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
          <StatusCell status={c.status} />
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {isOpen && (
          <tr className={cn(!isLast && "border-b border-ink-700/50")}>
            <td colSpan={4} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <ExpandedDetail contract={c} reviewable={reviewable} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function ExpandedDetail({
  contract: c,
  reviewable,
}: {
  contract: DashboardContract;
  reviewable: boolean;
}) {
  return (
    <div className="bg-ink-900 border-t border-ink-700/50 px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
        <Meta label="Filename" value={c.originalFilename} />
        <Meta label="Pages" value={c.pageCount != null ? `${c.pageCount}` : "—"} />
        <Meta label="Uploaded" value={formatShortDate(c.uploadedAt)} />
        <Meta
          label="Processed"
          value={c.processedAt ? timeAgo(c.processedAt) : "—"}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] uppercase tracking-wider text-ink-500">Risk breakdown</span>
        <div className="flex items-center flex-wrap gap-2">
          {c.riskCounts.high > 0 && <RiskBadge level="high" count={c.riskCounts.high} />}
          {c.riskCounts.medium > 0 && <RiskBadge level="medium" count={c.riskCounts.medium} />}
          {c.riskCounts.standard > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-risk-low/15 text-risk-low">
              {c.riskCounts.standard} Standard
            </span>
          )}
          {c.riskCounts.missing > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-risk-info/15 text-risk-info">
              {c.riskCounts.missing} Missing
            </span>
          )}
          {c.riskCounts.high === 0 &&
            c.riskCounts.medium === 0 &&
            c.riskCounts.standard === 0 &&
            c.riskCounts.missing === 0 && (
              <span className="text-[12px] text-ink-500">No risk data yet.</span>
            )}
        </div>
      </div>

      {reviewable && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={`/dashboard/uploads/${c.id}`}
            className="inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
          >
            Open review
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
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
