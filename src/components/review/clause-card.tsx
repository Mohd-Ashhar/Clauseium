"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  PenLine,
  X,
} from "lucide-react";
import type { ClauseAnalysis } from "@/types/contract";
import { useReview, type ClauseState } from "./review-context";
import { CitationChip } from "./citation-chip";
import { ConfidenceIndicator } from "./confidence-indicator";
import { RedlineDiff } from "./redline-diff";
import { RiskBadge } from "@/components/app/risk-badge";
import { cn } from "@/lib/utils";

const accentBorder: Record<string, string> = {
  high: "border-l-4 border-l-risk-high",
  medium: "border-l-4 border-l-risk-med",
  standard: "border-l-4 border-l-risk-low",
  low: "border-l-4 border-l-risk-low",
  missing: "border-l-4 border-l-risk-info",
};

const marketLabel = {
  above: { text: "Above standard", color: "text-risk-low" },
  at: { text: "At market standard", color: "text-ink-300" },
  below: { text: "Below standard", color: "text-risk-med" },
} as const;

export function ClauseCard({ clause }: { clause: ClauseAnalysis }) {
  const { activeClauseId, setActiveClauseId, clauseStates, setClauseState, toast } =
    useReview();
  const state = clauseStates[clause.id] ?? "pending";
  const isActive = activeClauseId === clause.id;

  const onToggle = () => setActiveClauseId(isActive ? null : clause.id);

  if (state === "accepted") {
    return (
      <AcceptedView
        clause={clause}
        onReopen={() => {
          setClauseState(clause.id, "pending");
          toast("Restored clause for re-review");
        }}
      />
    );
  }

  return (
    <article
      id={`card-clause-${clause.id}`}
      onClick={onToggle}
      className={cn(
        "bg-ink-850 border border-ink-700 rounded-xl p-4 mb-3 cursor-pointer transition-all",
        accentBorder[clause.riskLevel] ?? "",
        "hover:border-ink-500",
        isActive && "border-brand-500/50 ring-1 ring-brand-500/30",
        state === "rejected" && "opacity-60",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 shrink-0">
            §{clause.clauseNumber}
          </span>
          <h3 className="text-[14px] font-medium text-ink-100 truncate">{clause.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RiskBadge level={clause.riskLevel} />
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-500 transition-transform",
              isActive && "rotate-180",
            )}
          />
        </div>
      </div>

      {/* Summary */}
      <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">{clause.summary}</p>

      {/* Confidence (always visible) */}
      <div className="mt-3">
        <ConfidenceIndicator confidence={clause.confidence} />
      </div>

      {/* Expanded sections */}
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ExpandedSections clause={clause} state={state} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ExpandedSections({
  clause,
  state,
}: {
  clause: ClauseAnalysis;
  state: ClauseState;
}) {
  const { setClauseState, toast } = useReview();
  const market = marketLabel[clause.marketPosition];
  const hasRedline = Boolean(clause.suggestedRedline);
  const isStandard = clause.riskLevel === "standard" || clause.riskLevel === "low";

  return (
    <div className="mt-4 pt-4 border-t border-ink-700/60 space-y-4">
      {/* Why this matters */}
      {!isStandard && (
        <Section label="Why this matters">
          <p className="text-[13px] leading-relaxed text-ink-300">{clause.reasoning}</p>
        </Section>
      )}

      {isStandard && (
        <Section label="Why this is fine">
          <p className="text-[13px] leading-relaxed text-ink-300">
            This clause matches our playbook and the 50th-percentile drafting in our
            Indian commercial benchmark corpus. No changes recommended.
          </p>
        </Section>
      )}

      {/* Suggested redline */}
      {hasRedline && clause.suggestedRedline && (
        <Section label="Suggested redline">
          <RedlineDiff
            original={clause.originalText}
            suggested={clause.suggestedRedline}
          />
        </Section>
      )}

      {/* Legal basis */}
      {clause.citations.length > 0 && (
        <Section label="Legal basis">
          <div className="flex flex-wrap gap-1.5">
            {clause.citations.map((c) => (
              <CitationChip key={c.id} citation={c} />
            ))}
          </div>
        </Section>
      )}

      {/* Metadata strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span className={cn(market.color)}>Market position: {market.text}</span>
        <span className="text-ink-500">·</span>
        <span className={cn(clause.isFromPlaybook ? "text-ink-300" : "text-risk-med")}>
          Playbook match: {clause.isFromPlaybook ? "Found" : "Deviation flagged"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hasRedline && (
          <button
            onClick={() => {
              setClauseState(clause.id, "accepted");
              toast(`Redline accepted for §${clause.clauseNumber}`, "success");
            }}
            className="inline-flex items-center gap-1.5 bg-risk-low/15 hover:bg-risk-low/25 text-risk-low text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Accept redline
          </button>
        )}
        <button
          onClick={() => {
            setClauseState(clause.id, "modified");
            toast("Inline editor coming in next phase");
          }}
          className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-[13px] px-3 py-1.5 rounded-lg transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          Modify
        </button>
        <button
          onClick={() => {
            setClauseState(clause.id, "rejected");
            toast(`Suggestion rejected for §${clause.clauseNumber}`);
          }}
          className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-300 text-[13px] px-2 py-1.5 rounded-lg transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
        <button
          onClick={() => {
            const event = new CustomEvent("clauseium:ask-ai", {
              detail: `Tell me more about §${clause.clauseNumber} ${clause.title}`,
            });
            window.dispatchEvent(event);
          }}
          className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-[13px] px-2 py-1.5 rounded-lg transition-colors ml-auto"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Ask AI
        </button>
      </div>

      {state === "rejected" && (
        <p className="text-[12px] text-ink-500 italic">
          Suggestion rejected — original clause text retained.
        </p>
      )}
      {state === "modified" && (
        <p className="text-[12px] text-ink-500 italic">
          Marked for manual modification.
        </p>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-500 mb-2 font-medium">
        — {label} —
      </div>
      {children}
    </div>
  );
}

function AcceptedView({
  clause,
  onReopen,
}: {
  clause: ClauseAnalysis;
  onReopen: () => void;
}) {
  return (
    <article
      id={`card-clause-${clause.id}`}
      onClick={onReopen}
      className="bg-risk-low/5 border border-risk-low/20 rounded-xl px-4 py-3 mb-3 opacity-90 cursor-pointer hover:opacity-100 transition-opacity flex items-center gap-3"
    >
      <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 shrink-0">
            §{clause.clauseNumber}
          </span>
          <span className="text-[13px] font-medium text-ink-100 truncate">
            {clause.title}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-risk-low ml-auto shrink-0">
            Accepted
          </span>
        </div>
        <p className="text-[12px] text-ink-500 mt-0.5 truncate">
          Redline applied · {clause.summary}
        </p>
      </div>
    </article>
  );
}
