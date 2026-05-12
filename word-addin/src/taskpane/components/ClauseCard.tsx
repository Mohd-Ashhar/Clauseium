import { Check, ChevronDown, MessageSquare, X } from "lucide-react";
import { cn } from "@addin/lib/cn";
import {
  ACCENT_BORDER,
  CATEGORY_LABELS,
  stripCiteTokens,
} from "@addin/lib/constants";
import type {
  AnalysisClause,
  ClauseActionState,
  RiskLevel,
} from "@addin/types/contract";
import { CitationPill } from "./CitationPill";
import { ConfidenceBars } from "./ConfidenceBars";
import { RiskBadge } from "./RiskBadge";

// Ported from /src/components/uploads/upload-workspace.tsx ClauseCard
// (lines 1124-1233 in the source repo). Adapted for the 320-400px Word
// task pane:
//   - removed framer-motion (CSS height transition instead)
//   - dropped the "Modify" button (not in MVP add-in scope)
//   - "Ask AI" emits a callback instead of dispatching a window event;
//     the parent Workspace wires it to the ChatDrawer
// The visual fidelity to the web review pane is intentional — reviewers
// should see the same risk colors, badges, and copy in both surfaces.

interface ClauseCardProps {
  clause: AnalysisClause;
  isActive: boolean;
  state: ClauseActionState;
  onToggle: () => void;
  onAcceptRedline?: () => void;
  onReject?: () => void;
  onAskAi?: () => void;
}

export function ClauseCard({
  clause,
  isActive,
  state,
  onToggle,
  onAcceptRedline,
  onReject,
  onAskAi,
}: ClauseCardProps) {
  const risk = clause.risk;
  const level: RiskLevel = risk?.level ?? "standard";
  const cls = clause.classification;
  const title =
    clause.section_title ||
    (cls ? CATEGORY_LABELS[cls.category] : "Clause");

  return (
    <article
      id={`card-clause-${clause.id}`}
      onClick={onToggle}
      className={cn(
        "bg-ink-850 border border-ink-700 rounded-xl p-3 mb-2 cursor-pointer transition-all",
        ACCENT_BORDER[level],
        "hover:border-ink-500",
        isActive && "border-brand-500/50 ring-1 ring-brand-500/30",
        state === "rejected" && "opacity-60",
        state === "accepted" && "border-risk-low/30 bg-risk-low/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-500 shrink-0">
            §{clause.position ?? "—"}
          </span>
          <h3 className="text-[13px] font-medium text-ink-100 truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {risk && <RiskBadge level={risk.level} />}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-ink-500 transition-transform",
              isActive && "rotate-180",
            )}
          />
        </div>
      </div>

      <p className="text-[12.5px] text-ink-300 mt-2 leading-relaxed line-clamp-2">
        {risk?.issue || stripCiteTokens(clause.clause_text)}
      </p>

      {risk && risk.confidence !== null && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-500">
            Confidence
          </span>
          <ConfidenceBars confidence={risk.confidence} />
          <span className="text-[10px] text-ink-400 font-[family-name:var(--font-mono)]">
            {Math.round(risk.confidence * 100)}%
          </span>
        </div>
      )}

      <div
        // CSS-only expand/collapse so the bundle doesn't carry framer-motion
        // for one transition. grid-rows-[0fr] → [1fr] animates intrinsic height.
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden">
          <ExpandedSections
            clause={clause}
            state={state}
            onAcceptRedline={onAcceptRedline}
            onReject={onReject}
            onAskAi={onAskAi}
          />
        </div>
      </div>
    </article>
  );
}

function ExpandedSections({
  clause,
  state,
  onAcceptRedline,
  onReject,
  onAskAi,
}: {
  clause: AnalysisClause;
  state: ClauseActionState;
  onAcceptRedline?: () => void;
  onReject?: () => void;
  onAskAi?: () => void;
}) {
  const risk = clause.risk;
  const hasRedline = Boolean(risk?.suggestion);
  const isStandard = !risk || risk.level === "low" || risk.level === "standard";
  const citations = clause.citations ?? [];

  return (
    <div className="mt-3 pt-3 border-t border-ink-700/60 space-y-3">
      {!isStandard && risk?.explanation && (
        <Section label="Why this matters">
          <p className="text-[12.5px] leading-relaxed text-ink-300">
            {stripCiteTokens(risk.explanation)}
          </p>
        </Section>
      )}

      {isStandard && (
        <Section label="Why this is fine">
          <p className="text-[12.5px] leading-relaxed text-ink-300">
            Matches our playbook and the 50th-percentile drafting in our
            Indian commercial benchmark. No changes recommended.
          </p>
        </Section>
      )}

      {hasRedline && risk?.suggestion && (
        <Section label="Suggested redline">
          <div className="rounded bg-ink-950/70 border border-ink-700/60 px-2.5 py-2">
            <p className="text-[12.5px] text-ink-200 leading-relaxed">
              {stripCiteTokens(risk.suggestion)}
            </p>
          </div>
        </Section>
      )}

      {citations.length > 0 && (
        <Section label="Legal basis">
          <div className="flex flex-wrap gap-1.5">
            {citations.map((c) => (
              <CitationPill key={c.id} citation={c} />
            ))}
          </div>
        </Section>
      )}

      {risk && risk.rule_ids && risk.rule_ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="text-ink-500">Rules:</span>
          {risk.rule_ids.slice(0, 4).map((rid) => (
            <span
              key={rid}
              className="inline-flex items-center rounded border border-ink-700/60 px-1.5 py-0.5 text-[10px] text-ink-400 font-[family-name:var(--font-mono)]"
            >
              {rid}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {hasRedline && state !== "accepted" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptRedline?.();
            }}
            className="inline-flex items-center gap-1.5 bg-risk-low/15 hover:bg-risk-low/25 text-risk-low text-[12px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Check className="h-3 w-3" />
            Accept redline
          </button>
        )}
        {state !== "rejected" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReject?.();
            }}
            className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-300 text-[12px] px-2 py-1.5 rounded-md transition-colors"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAskAi?.();
          }}
          className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-[12px] px-2 py-1.5 rounded-md transition-colors ml-auto"
        >
          <MessageSquare className="h-3 w-3" />
          Ask AI
        </button>
      </div>

      {state === "rejected" && (
        <p className="text-[11px] text-ink-500 italic">
          Suggestion rejected — original clause text retained.
        </p>
      )}
      {state === "accepted" && (
        <p className="text-[11px] text-risk-low italic">
          Redline applied as a tracked change in the document.
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
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-ink-500 mb-1.5 font-medium">
        — {label} —
      </div>
      {children}
    </div>
  );
}
