"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Download,
  ExternalLink,
  Gavel,
  GripHorizontal,
  Info,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Printer,
  Share2,
  X,
  Zap,
} from "lucide-react";
import type { StructuredDocument } from "@/types/ingestion";
import type {
  CitationStatus,
  ClauseAnalysis,
  ClauseCategory,
  Contract,
  DocumentAnalysisView,
  LegalCitation,
  RiskLevel,
} from "@/types/contract";
import type {
  ClassificationLabel,
  ClassificationMethod,
} from "@/lib/classification";
import type { RiskMethod } from "@/lib/risk";
import { AskAiChat } from "./ask-ai-chat";
import { type ClauseActionState } from "./clause-actions";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<ClassificationLabel, string> = {
  indemnification: "Indemnification",
  limitation_of_liability: "Limitation of Liability",
  termination: "Termination",
  governing_law: "Governing Law",
  jurisdiction: "Jurisdiction",
  data_protection_dpdp: "DPDP / Data Protection",
  payment_terms: "Payment Terms",
  ip_assignment: "IP Assignment",
  other: "Other",
};

const RISK_RANK: Record<RiskLevel, number> = {
  high: 0,
  missing: 1,
  medium: 2,
  low: 3,
  standard: 3,
};

const ACCENT_BORDER: Record<RiskLevel, string> = {
  high: "border-l-4 border-l-risk-high",
  medium: "border-l-4 border-l-risk-med",
  missing: "border-l-4 border-l-risk-info",
  low: "border-l-4 border-l-risk-low",
  standard: "border-l-4 border-l-risk-low",
};

const RISK_BADGE: Record<
  RiskLevel,
  { tone: string; dot: string; label: string }
> = {
  high: {
    tone: "bg-risk-high/15 text-risk-high border-risk-high/30",
    dot: "bg-risk-high",
    label: "High",
  },
  medium: {
    tone: "bg-risk-med/15 text-risk-med border-risk-med/30",
    dot: "bg-risk-med",
    label: "Medium",
  },
  missing: {
    tone: "bg-risk-info/15 text-risk-info border-risk-info/30",
    dot: "bg-risk-info",
    label: "Missing",
  },
  low: {
    tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
    dot: "bg-risk-low",
    label: "Low",
  },
  standard: {
    tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
    dot: "bg-risk-low",
    label: "Standard",
  },
};

const CITATION_TONES: Record<CitationStatus, string> = {
  verified: "bg-risk-low/10 text-risk-low border-risk-low/30",
  partially_verified: "bg-risk-med/10 text-risk-med border-risk-med/30",
  unverified: "bg-risk-high/10 text-risk-high border-risk-high/30",
};

const CITATION_LABELS: Record<CitationStatus, string> = {
  verified: "verified",
  partially_verified: "partial",
  unverified: "unverified",
};

const CATEGORY_TO_CONTRACT: Record<ClassificationLabel, ClauseCategory> = {
  indemnification: "indemnification",
  limitation_of_liability: "limitation_of_liability",
  termination: "termination",
  governing_law: "governing_law",
  jurisdiction: "jurisdiction",
  data_protection_dpdp: "data_protection_dpdp",
  payment_terms: "payment_terms",
  ip_assignment: "ip_assignment",
  // Preserve "other" honestly instead of mislabeling it as confidentiality in
  // exports — these are genuinely uncategorized clauses.
  other: "other",
};

export interface ClauseWorkspaceItem {
  id: string;
  position: number;
  text: string;
  sectionTitle: string;
  classification: {
    category: ClassificationLabel;
    confidence: number;
    method: ClassificationMethod;
  } | null;
  risk: {
    level: RiskLevel;
    issue: string | null;
    explanation: string | null;
    suggestion: string | null;
    confidence: number | null;
    method: RiskMethod | null;
    ruleIds: string[];
  } | null;
  citations: LegalCitation[];
  trustScore: number | null;
  action: ClauseActionState;
  actionNote: string | null;
}

export interface WorkspaceSummary {
  high: number;
  medium: number;
  missing: number;
  low: number;
  standard: number;
  totalClauses: number;
  verifiedCitations: number;
  partialCitations: number;
  droppedCitations: number;
  overallTrust: number | null;
  overallRiskScore: number; // 0–100
}

export interface UploadWorkspaceProps {
  contractId: string;
  contractTitle: string;
  originalFilename: string;
  pageCount: number | null;
  structured: StructuredDocument;
  clauses: ClauseWorkspaceItem[];
  summary: WorkspaceSummary;
  // Whole-document analysis (missing protections, cross-clause issues,
  // one-sided terms, executive summary). Null when not yet available.
  documentAnalysis?: DocumentAnalysisView | null;
  // True when one or more analysis stages failed/degraded during processing.
  // Drives a non-blocking warning so a degraded review is never mistaken for a
  // clean "0 high risk" result.
  partial?: boolean;
  analysisNotes?: string[];
}

function buildContractForExport(args: {
  contractId: string;
  contractTitle: string;
  originalFilename: string;
  pageCount: number | null;
  clauses: ClauseWorkspaceItem[];
  summary: WorkspaceSummary;
}): Contract {
  const { contractId, contractTitle, originalFilename, pageCount, clauses, summary } = args;

  const analysisClauses: ClauseAnalysis[] = clauses
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => {
      const category: ClauseCategory = c.classification
        ? CATEGORY_TO_CONTRACT[c.classification.category]
        : "confidentiality";
      const cleanText = stripCiteTokens(c.text) || c.text;
      const cleanIssue = stripCiteTokens(c.risk?.issue ?? null);
      const cleanReasoning = stripCiteTokens(c.risk?.explanation ?? null);
      const cleanSuggestion = stripCiteTokens(c.risk?.suggestion ?? null);
      const level: RiskLevel = c.risk?.level ?? "standard";
      const summaryText = cleanIssue || (level === "missing"
        ? "Required clause not present in this contract."
        : level === "standard" || level === "low"
          ? "Matches our playbook and the Indian commercial benchmark corpus."
          : "Material risk identified for reviewer attention.");
      return {
        id: c.id,
        clauseNumber: String(c.position),
        category,
        title: c.sectionTitle || `Clause ${c.position}`,
        originalText: cleanText,
        riskLevel: level,
        summary: summaryText,
        reasoning: cleanReasoning || "",
        suggestedRedline: cleanSuggestion || undefined,
        citations: c.citations,
        confidence: c.risk?.confidence ?? 0,
        isFromPlaybook: false,
        marketPosition: "at",
        trustScore: c.trustScore ?? undefined,
        issue: cleanIssue || undefined,
      };
    });

  const totalRisky = summary.high * 6 + summary.medium * 2 + summary.missing * 3;
  const ceiling = summary.totalClauses * 6;
  const overall = ceiling === 0 ? 0 : Math.min(1, totalRisky / ceiling);
  const overallScore = Math.round(overall * 100);

  const fileSize = pageCount ? `${pageCount} pages` : originalFilename;

  return {
    id: contractId,
    title: contractTitle,
    counterparty: "—",
    contractType: "msa",
    jurisdiction: "India",
    governingLaw: "Indian Contract Act, 1872",
    status: "in_progress",
    riskSummary: {
      high: summary.high,
      medium: summary.medium,
      low: summary.low,
      standard: summary.standard,
      missing: summary.missing,
      overallScore,
      escalationRecommended: summary.high > 0,
    },
    totalClauses: summary.totalClauses,
    reviewedClauses: 0,
    uploadedBy: "—",
    uploadedAt: new Date(),
    lastUpdated: new Date(),
    version: 1,
    fileSize,
    pageCount: pageCount ?? 0,
    tags: [],
    clauses: analysisClauses,
  };
}

type FilterLevel = "all" | "high" | "medium" | "standard" | "missing";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "info";
}

export function UploadWorkspace({
  contractId,
  contractTitle,
  originalFilename,
  pageCount,
  structured,
  clauses,
  summary,
  documentAnalysis = null,
  partial = false,
  analysisNotes = [],
}: UploadWorkspaceProps) {
  const [filter, setFilter] = useState<FilterLevel>("all");
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [clauseStates, setClauseStates] = useState<
    Record<string, ClauseActionState>
  >(() => {
    const init: Record<string, ClauseActionState> = {};
    for (const c of clauses) init[c.id] = c.action;
    return init;
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const toast = (message: string, tone: "success" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Pulse the active clause when it changes via the right pane.
  useEffect(() => {
    if (!activeClauseId) return;
    const docEl = document.getElementById(`doc-clause-${activeClauseId}`);
    const cardEl = document.getElementById(`card-clause-${activeClauseId}`);
    docEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    cardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (docEl) {
      docEl.classList.add("doc-section-pulse");
      const t = setTimeout(
        () => docEl.classList.remove("doc-section-pulse"),
        1500,
      );
      return () => clearTimeout(t);
    }
  }, [activeClauseId]);

  const setClauseAction = async (
    clauseId: string,
    next: Exclude<ClauseActionState, "pending">,
  ) => {
    const prev = clauseStates[clauseId] ?? "pending";
    setClauseStates((s) => ({ ...s, [clauseId]: next }));
    try {
      const res = await fetch(`/api/contracts/${contractId}/clause-actions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clause_id: clauseId, state: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setClauseStates((s) => ({ ...s, [clauseId]: prev }));
      toast("Could not save — try again", "info");
    }
  };

  const resetClauseAction = async (clauseId: string) => {
    const prev = clauseStates[clauseId] ?? "pending";
    setClauseStates((s) => ({ ...s, [clauseId]: "pending" }));
    try {
      const res = await fetch(`/api/contracts/${contractId}/clause-actions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clause_id: clauseId }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setClauseStates((s) => ({ ...s, [clauseId]: prev }));
      toast("Could not reset — try again", "info");
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const exportContractAs = async (
    format: "redlined" | "clean" | "summary" | "full",
  ) => {
    if (isExporting) return;
    setIsExporting(true);
    const labelMap = {
      redlined: "Redlined Word doc",
      clean: "Clean Word doc",
      summary: "Risk summary PDF",
      full: "Full analysis report",
    } as const;
    toast(`Generating ${labelMap[format]}…`, "info");
    try {
      const contract = buildContractForExport({
        contractId,
        contractTitle,
        originalFilename,
        pageCount,
        clauses,
        summary,
      });
      const [{ exportContract }, { triggerDownload }] = await Promise.all([
        import("@/lib/export"),
        import("@/lib/export/download"),
      ]);
      const { blob, filename } = await exportContract({
        contract,
        clauseStates,
        format,
        includeReasoning: true,
      });
      triggerDownload(blob, filename);
      toast(`Downloaded ${filename}`, "success");
    } catch (err) {
      console.error("Export failed", err);
      toast("Export failed — please try again", "info");
    } finally {
      setIsExporting(false);
    }
  };

  const acceptAllStandard = () => {
    let count = 0;
    for (const c of clauses) {
      const lvl = c.risk?.level;
      if ((!c.risk || lvl === "low" || lvl === "standard") &&
          (clauseStates[c.id] ?? "pending") !== "accepted") {
        void setClauseAction(c.id, "accepted");
        count++;
      }
    }
    toast(
      `Accepted ${count} standard clause${count === 1 ? "" : "s"}`,
      "success",
    );
  };

  const clauseById = useMemo(() => {
    const m = new Map<string, ClauseWorkspaceItem>();
    for (const c of clauses) m.set(c.id, c);
    return m;
  }, [clauses]);

  const visible = useMemo(() => {
    let list = clauses;
    if (filter === "high") list = list.filter((c) => c.risk?.level === "high");
    else if (filter === "medium")
      list = list.filter((c) => c.risk?.level === "medium");
    else if (filter === "missing")
      list = list.filter((c) => c.risk?.level === "missing");
    else if (filter === "standard")
      list = list.filter(
        (c) => !c.risk || c.risk.level === "low" || c.risk.level === "standard",
      );
    return [...list].sort((a, b) => {
      const ar = a.risk ? RISK_RANK[a.risk.level] : 4;
      const br = b.risk ? RISK_RANK[b.risk.level] : 4;
      if (ar !== br) return ar - br;
      return a.position - b.position;
    });
  }, [clauses, filter]);

  return (
    <div className="-mx-6 -my-6 h-[calc(100vh-3.5rem)] flex flex-col bg-ink-950">
      <TopBar
        contractTitle={contractTitle}
        originalFilename={originalFilename}
        pageCount={pageCount}
        summary={summary}
        toast={toast}
        onExport={exportContractAs}
        isExporting={isExporting}
      />

      {partial && <PartialAnalysisBanner notes={analysisNotes} />}

      <div className="hidden lg:flex flex-1 min-h-0">
        <Group orientation="horizontal" className="flex-1 flex">
          <Panel defaultSize={55} minSize={35} maxSize={70} className="min-w-0">
            <DocumentPane
              title={contractTitle}
              originalFilename={originalFilename}
              pageCount={pageCount}
              structured={structured}
              clauseById={clauseById}
              activeClauseId={activeClauseId}
            />
          </Panel>
          <Separator className="w-1 bg-ink-700 hover:bg-brand-500 data-[resize-state=dragging]:bg-brand-500 transition-colors cursor-col-resize" />
          <Panel defaultSize={45} minSize={30} maxSize={65} className="min-w-0">
            <RightColumn
              contractId={contractId}
              summary={summary}
              clauses={visible}
              documentAnalysis={documentAnalysis}
              filter={filter}
              setFilter={setFilter}
              activeClauseId={activeClauseId}
              setActiveClauseId={setActiveClauseId}
              clauseStates={clauseStates}
              setClauseAction={setClauseAction}
              resetClauseAction={resetClauseAction}
              acceptAllStandard={acceptAllStandard}
              toast={toast}
            />
          </Panel>
        </Group>
      </div>

      {/* Mobile fallback: stack panes vertically. */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto dark-scrollbar">
        <DocumentPane
          title={contractTitle}
          originalFilename={originalFilename}
          pageCount={pageCount}
          structured={structured}
          clauseById={clauseById}
          activeClauseId={activeClauseId}
        />
        <AnalysisPane
          contractId={contractId}
          summary={summary}
          clauses={visible}
          documentAnalysis={documentAnalysis}
          filter={filter}
          setFilter={setFilter}
          activeClauseId={activeClauseId}
          setActiveClauseId={setActiveClauseId}
          clauseStates={clauseStates}
          setClauseAction={setClauseAction}
          resetClauseAction={resetClauseAction}
          acceptAllStandard={acceptAllStandard}
          toast={toast}
        />
        <div className="h-[60vh] border-t border-ink-700">
          <AskAiChat contractId={contractId} />
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

function TopBar({
  contractTitle,
  originalFilename,
  pageCount,
  summary,
  toast,
  onExport,
  isExporting,
}: {
  contractTitle: string;
  originalFilename: string;
  pageCount: number | null;
  summary: WorkspaceSummary;
  toast: (m: string, t?: "success" | "info") => void;
  onExport: (format: "redlined" | "clean" | "summary" | "full") => Promise<void>;
  isExporting: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stdCount = summary.standard + summary.low;

  return (
    <header className="h-14 shrink-0 bg-ink-900 border-b border-ink-700 flex items-center px-3 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          href="/dashboard"
          className="h-8 w-8 flex items-center justify-center rounded text-ink-500 hover:text-ink-100 hover:bg-ink-850 transition-colors shrink-0"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[15px] font-medium text-ink-100 truncate"
            title={contractTitle}
          >
            {contractTitle}
          </span>
          <span className="bg-ink-800 text-ink-400 text-xs px-2 py-0.5 rounded font-[family-name:var(--font-mono)] shrink-0">
            v1
          </span>
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
        <Chip>{originalFilename}</Chip>
        {pageCount ? <Chip>{pageCount} pages</Chip> : null}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1.5">
          {summary.high > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-high/15 text-risk-high">
              {summary.high} High
            </span>
          )}
          {summary.medium > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-med/15 text-risk-med">
              {summary.medium} With
            </span>
          )}
          {stdCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-low/15 text-risk-low">
              {stdCount} Std
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => void onExport("redlined")}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-wait"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {isExporting ? "Generating…" : "Export Redlined Word"}
          </span>
          <span className="sm:hidden">{isExporting ? "…" : "Export"}</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-ink-500 hover:text-ink-100 hover:bg-ink-850 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 bg-ink-800 border border-ink-700 rounded-lg shadow-xl py-1 z-30"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <MenuItem
                icon={<Download className="h-3.5 w-3.5" />}
                label="Download original"
                onClick={() => {
                  toast("Download will be available after backend integration");
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Share2 className="h-3.5 w-3.5" />}
                label="Share review"
                onClick={() => {
                  toast("Sharing coming in next phase");
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Printer className="h-3.5 w-3.5" />}
                label="Print summary"
                onClick={() => {
                  toast("Print summary coming in next phase");
                  setMenuOpen(false);
                }}
              />
              <div className="my-1 border-t border-ink-700" />
              <MenuItem
                icon={<Archive className="h-3.5 w-3.5" />}
                label="Archive"
                onClick={() => {
                  toast("Contract archived", "success");
                  setMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-ink-850 border border-ink-700 text-ink-400 text-xs px-2.5 py-1 rounded-full truncate max-w-[200px]">
      {children}
    </span>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-300 hover:bg-ink-850 hover:text-ink-100 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function DocumentPane({
  title,
  originalFilename,
  pageCount,
  structured,
  clauseById,
  activeClauseId,
}: {
  title: string;
  originalFilename: string;
  pageCount: number | null;
  structured: StructuredDocument;
  clauseById: Map<string, ClauseWorkspaceItem>;
  activeClauseId: string | null;
}) {
  return (
    <div className="h-full flex flex-col bg-ink-850 min-h-0">
      <div className="flex-1 overflow-y-auto dark-scrollbar">
        <article className="max-w-3xl mx-auto px-12 py-10">
          <header className="pb-6 mb-6 border-b border-ink-700/60">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-100 leading-tight">
              {title}
            </h1>
            <p className="text-[13px] text-ink-500 mt-2">
              {originalFilename}
              {pageCount ? ` · ${pageCount} pages` : ""}
            </p>
          </header>
          <div className="space-y-1">
            {structured.sections.map((section, i) => (
              <section key={`${section.title}-${i}`} className="pt-4">
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-ink-100 mb-2">
                  {section.title}
                </h2>
                <div className="space-y-1">
                  {section.clauses.map((clause) => {
                    const item = clauseById.get(clause.id);
                    const lvl = item?.risk?.level;
                    const isActive = activeClauseId === clause.id;
                    const accent =
                      lvl === "high"
                        ? "before:bg-risk-high"
                        : lvl === "medium"
                          ? "before:bg-risk-med"
                          : lvl === "missing"
                            ? "before:bg-risk-info"
                            : "before:bg-transparent";
                    return (
                      <div
                        key={clause.id}
                        id={`doc-clause-${clause.id}`}
                        className={cn(
                          "relative pl-6 py-3 my-1 rounded transition-colors",
                          "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-full",
                          accent,
                          isActive && "bg-brand-500/5",
                        )}
                      >
                        <p className="text-[14px] leading-[1.85] text-ink-200 whitespace-pre-wrap">
                          <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-500 mr-2">
                            #{clause.position}
                          </span>
                          {clause.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

// Right column = AnalysisPane on top + AskAiChat on bottom, with a draggable
// horizontal resizer between them. We manage height in pixels (instead of using
// react-resizable-panels) because the chat needs a guaranteed minimum so the
// input box always stays visible above the fold.
const ASK_AI_DEFAULT_HEIGHT = 420;
const ASK_AI_MIN_HEIGHT = 56; // collapsed → just the header
const ASK_AI_HEADER_ONLY = 56;
const ANALYSIS_MIN_HEIGHT = 200;

function RightColumn({
  contractId,
  summary,
  clauses,
  documentAnalysis,
  filter,
  setFilter,
  activeClauseId,
  setActiveClauseId,
  clauseStates,
  setClauseAction,
  resetClauseAction,
  acceptAllStandard,
  toast,
}: AnalysisPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [askHeight, setAskHeight] = useState(ASK_AI_DEFAULT_HEIGHT);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lastExpandedRef = useRef(ASK_AI_DEFAULT_HEIGHT);

  const effectiveHeight = collapsed ? ASK_AI_HEADER_ONLY : askHeight;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const startY = e.clientY;
    const startHeight = askHeight;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const containerHeight = containerRect?.height ?? 800;

    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY; // dragging up grows the chat
      const next = startHeight + delta;
      const max = Math.max(ASK_AI_MIN_HEIGHT, containerHeight - ANALYSIS_MIN_HEIGHT);
      const clamped = Math.min(max, Math.max(ASK_AI_MIN_HEIGHT, next));
      setAskHeight(clamped);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const toggleCollapsed = () => {
    if (collapsed) {
      setCollapsed(false);
      setAskHeight(lastExpandedRef.current);
    } else {
      lastExpandedRef.current = askHeight;
      setCollapsed(true);
    }
  };

  const expandToFill = () => {
    const containerHeight =
      containerRef.current?.getBoundingClientRect().height ?? 800;
    setCollapsed(false);
    setAskHeight(Math.max(ASK_AI_MIN_HEIGHT, containerHeight - ANALYSIS_MIN_HEIGHT));
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-ink-900 min-h-0">
      <div className="flex-1 min-h-0">
        <AnalysisPane
          contractId={contractId}
          summary={summary}
          clauses={clauses}
          documentAnalysis={documentAnalysis}
          filter={filter}
          setFilter={setFilter}
          activeClauseId={activeClauseId}
          setActiveClauseId={setActiveClauseId}
          clauseStates={clauseStates}
          setClauseAction={setClauseAction}
          resetClauseAction={resetClauseAction}
          acceptAllStandard={acceptAllStandard}
          toast={toast}
        />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize Ask Clauseium panel"
        onPointerDown={onPointerDown}
        onDoubleClick={() => setAskHeight(ASK_AI_DEFAULT_HEIGHT)}
        className={cn(
          "group relative h-2 shrink-0 flex items-center justify-center bg-ink-800 border-y border-ink-700 transition-colors",
          collapsed ? "cursor-default" : "cursor-row-resize hover:bg-brand-500/20",
          dragging && "bg-brand-500/30",
        )}
      >
        <GripHorizontal
          className={cn(
            "h-3 w-3 text-ink-500 transition-colors pointer-events-none",
            !collapsed && "group-hover:text-brand-300",
            dragging && "text-brand-200",
          )}
        />
      </div>

      <div
        style={{ height: `${effectiveHeight}px` }}
        className="shrink-0 overflow-hidden border-t border-ink-700/60"
      >
        <AskAiChat
          contractId={contractId}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onExpand={expandToFill}
        />
      </div>
    </div>
  );
}

interface AnalysisPaneProps {
  contractId: string;
  summary: WorkspaceSummary;
  clauses: ClauseWorkspaceItem[];
  documentAnalysis?: DocumentAnalysisView | null;
  filter: FilterLevel;
  setFilter: (f: FilterLevel) => void;
  activeClauseId: string | null;
  setActiveClauseId: (id: string | null) => void;
  clauseStates: Record<string, ClauseActionState>;
  setClauseAction: (
    id: string,
    next: Exclude<ClauseActionState, "pending">,
  ) => Promise<void>;
  resetClauseAction: (id: string) => Promise<void>;
  acceptAllStandard: () => void;
  toast: (m: string, t?: "success" | "info") => void;
}

function AnalysisPane({
  contractId,
  summary,
  clauses,
  documentAnalysis,
  filter,
  setFilter,
  activeClauseId,
  setActiveClauseId,
  clauseStates,
  setClauseAction,
  resetClauseAction,
  acceptAllStandard,
  toast,
}: AnalysisPaneProps) {
  return (
    <div className="h-full flex flex-col bg-ink-900 min-h-0">
      <header className="px-5 pt-5 pb-3 border-b border-ink-700 space-y-3 shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-100">AI Review</h2>
          <span className="text-[12px] text-ink-500 truncate">
            {summary.totalClauses} clauses · {summary.high} high risk
          </span>
        </div>
        <FilterRow filter={filter} setFilter={setFilter} summary={summary} />
      </header>

      <div className="flex-1 overflow-y-auto dark-scrollbar px-5 py-4">
        <SummaryCard
          summary={summary}
          acceptAllStandard={acceptAllStandard}
          toast={toast}
        />

        {documentAnalysis && (
          <DocumentReviewCard analysis={documentAnalysis} />
        )}

        <div className="mt-4">
          {clauses.length === 0 ? (
            <p className="text-center text-sm text-ink-500 py-8">
              No clauses match this filter.
            </p>
          ) : (
            clauses.map((c) => (
              <ClauseCard
                key={c.id}
                contractId={contractId}
                clause={c}
                isActive={activeClauseId === c.id}
                onToggle={() =>
                  setActiveClauseId(activeClauseId === c.id ? null : c.id)
                }
                state={clauseStates[c.id] ?? "pending"}
                setClauseAction={setClauseAction}
                resetClauseAction={resetClauseAction}
                toast={toast}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  filter,
  setFilter,
  summary,
}: {
  filter: FilterLevel;
  setFilter: (f: FilterLevel) => void;
  summary: WorkspaceSummary;
}) {
  const tabs: Array<{ key: FilterLevel; label: string; count: number }> = [
    { key: "all", label: "All", count: summary.totalClauses },
    { key: "high", label: "High", count: summary.high },
    { key: "medium", label: "Medium", count: summary.medium },
    {
      key: "standard",
      label: "Standard",
      count: summary.standard + summary.low,
    },
    { key: "missing", label: "Missing", count: summary.missing },
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto dark-scrollbar -mx-1 px-1">
      {tabs.map((t) => {
        if (t.key !== "all" && t.count === 0) return null;
        const active = filter === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "text-xs px-3 py-1 rounded-full transition-colors whitespace-nowrap",
              active
                ? "bg-brand-500/15 text-brand-200"
                : "bg-ink-850 text-ink-500 hover:text-ink-300",
            )}
          >
            {t.label} ({t.count})
          </button>
        );
      })}
    </div>
  );
}

const POSTURE_META: Record<
  DocumentAnalysisView["overallPosture"],
  { label: string; tone: string }
> = {
  favourable: { label: "Favourable", tone: "bg-risk-low/15 text-risk-low" },
  balanced: { label: "Balanced", tone: "bg-risk-info/15 text-risk-info" },
  unfavourable: { label: "Unfavourable", tone: "bg-risk-med/15 text-risk-med" },
  high_risk: { label: "High risk", tone: "bg-risk-high/15 text-risk-high" },
};

// Whole-document analysis surface (Phase 1): executive summary, detected type,
// missing protections, cross-clause issues, one-sided terms. This is the
// document-level intelligence a clause-by-clause list cannot show.
function DocumentReviewCard({ analysis }: { analysis: DocumentAnalysisView }) {
  const [open, setOpen] = useState(true);
  const posture = POSTURE_META[analysis.overallPosture];
  const missing = analysis.missingProtections ?? [];
  const cross = analysis.crossClauseIssues ?? [];
  const oneSided = analysis.oneSidedTerms ?? [];
  const totalFindings = missing.length + cross.length + oneSided.length;

  return (
    <div className="mt-4 bg-brand-500/5 border border-brand-500/20 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Gavel className="h-4 w-4 text-brand-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-ink-100">
                Document Review
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium",
                  posture.tone,
                )}
              >
                {posture.label}
              </span>
            </div>
            <p className="text-[11.5px] text-ink-500 mt-0.5 truncate">
              {analysis.contractTypeLabel} · {totalFindings} document-level
              finding{totalFindings === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ink-500 transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {analysis.executiveSummary && (
                <p className="text-[13px] leading-relaxed text-ink-300">
                  {analysis.executiveSummary}
                </p>
              )}

              {missing.length > 0 && (
                <DocFindingGroup
                  title={`Missing protections (${missing.length})`}
                  items={missing.map((m) => ({
                    level: m.riskLevel,
                    heading: m.label,
                    body: m.rationale,
                    extraLabel: m.suggestedClause ? "Suggested clause" : null,
                    extra: m.suggestedClause || null,
                  }))}
                />
              )}

              {cross.length > 0 && (
                <DocFindingGroup
                  title={`Cross-clause issues (${cross.length})`}
                  items={cross.map((c) => ({
                    level: c.riskLevel,
                    heading:
                      c.title +
                      (c.clausePositions.length
                        ? ` (§${c.clausePositions.join(", §")})`
                        : ""),
                    body: c.explanation,
                    extraLabel: c.recommendation ? "Recommendation" : null,
                    extra: c.recommendation || null,
                  }))}
                />
              )}

              {oneSided.length > 0 && (
                <DocFindingGroup
                  title={`One-sided terms (${oneSided.length})`}
                  items={oneSided.map((o) => ({
                    level: o.riskLevel,
                    heading:
                      o.title +
                      (o.clausePosition != null ? ` (§${o.clausePosition})` : ""),
                    body: o.explanation,
                    extraLabel: o.recommendation ? "Recommendation" : null,
                    extra: o.recommendation || null,
                  }))}
                />
              )}

              {totalFindings === 0 && (
                <p className="text-[12.5px] text-ink-400">
                  No document-level issues detected — standard protections appear
                  present and no cross-clause conflicts were found.
                </p>
              )}

              {analysis.degraded && (
                <p className="text-[11px] text-ink-500 italic">
                  Checklist-based analysis only (AI document pass unavailable).
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DocFindingGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{
    level: RiskLevel;
    heading: string;
    body: string;
    extraLabel: string | null;
    extra: string | null;
  }>;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-500 mb-2 font-medium">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg bg-ink-850/60 border border-ink-700/60 px-3 py-2.5",
              ACCENT_BORDER[it.level],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink-100">
                {it.heading}
              </span>
              <RiskBadge level={it.level} />
            </div>
            <p className="text-[12.5px] text-ink-300 mt-1 leading-relaxed">
              {stripCiteTokens(it.body) || it.body}
            </p>
            {it.extra && (
              <div className="mt-2 rounded bg-ink-950/60 border border-ink-700/60 px-2.5 py-1.5">
                {it.extraLabel && (
                  <div className="text-[9.5px] uppercase tracking-wider text-ink-500 mb-0.5">
                    {it.extraLabel}
                  </div>
                )}
                <p className="text-[12px] text-ink-200 leading-relaxed">
                  {stripCiteTokens(it.extra) || it.extra}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  summary,
  acceptAllStandard,
  toast,
}: {
  summary: WorkspaceSummary;
  acceptAllStandard: () => void;
  toast: (m: string, t?: "success" | "info") => void;
}) {
  const score = summary.overallRiskScore;
  const stdCount = summary.standard + summary.low;
  const escalate =
    summary.high >= 3 || (summary.high >= 1 && summary.medium >= 4);
  const escalationReason = escalate
    ? `${summary.high} high-risk ${summary.high === 1 ? "clause" : "clauses"}${
        summary.medium > 0 ? ` and ${summary.medium} medium-risk` : ""
      } detected; recommend external counsel review`
    : null;

  const scoreColor =
    score < 40 ? "bg-risk-high" : score < 70 ? "bg-risk-med" : "bg-risk-low";

  return (
    <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-brand-300 font-medium">
          Review Summary
        </span>
        <span className="text-[11px] text-ink-500">v1</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {summary.high > 0 && (
          <Pill tone="high">{summary.high} High</Pill>
        )}
        {summary.medium > 0 && (
          <Pill tone="med">{summary.medium} Medium</Pill>
        )}
        {stdCount > 0 && <Pill tone="low">{stdCount} Standard</Pill>}
        {summary.missing > 0 && (
          <Pill tone="info">{summary.missing} Missing</Pill>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[13px] text-ink-300">Overall risk score</span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink-100">
            {score}
            <span className="text-ink-500 text-sm">/100</span>
          </span>
        </div>
        <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", scoreColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {escalate && escalationReason && (
        <div className="flex items-start gap-2.5 bg-risk-med/8 border border-risk-med/20 rounded-lg p-3">
          <Zap className="h-4 w-4 text-risk-med shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-risk-med">
              Recommendation: Escalate to senior counsel
            </p>
            <p className="text-[12.5px] text-ink-300 mt-1 leading-relaxed">
              {escalationReason}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={acceptAllStandard}
          className="inline-flex items-center gap-1.5 bg-risk-low/10 hover:bg-risk-low/20 text-risk-low text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Accept all standard ✓
        </button>
        <button
          type="button"
          onClick={() => toast("Export summary coming in next phase", "info")}
          className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-[13px] px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export summary
        </button>
      </div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "high" | "med" | "low" | "info";
  children: React.ReactNode;
}) {
  const map = {
    high: "bg-risk-high/15 text-risk-high",
    med: "bg-risk-med/15 text-risk-med",
    low: "bg-risk-low/15 text-risk-low",
    info: "bg-risk-info/15 text-risk-info",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

function ClauseCard({
  contractId,
  clause,
  isActive,
  onToggle,
  state,
  setClauseAction,
  resetClauseAction,
  toast,
}: {
  contractId: string;
  clause: ClauseWorkspaceItem;
  isActive: boolean;
  onToggle: () => void;
  state: ClauseActionState;
  setClauseAction: (
    id: string,
    next: Exclude<ClauseActionState, "pending">,
  ) => Promise<void>;
  resetClauseAction: (id: string) => Promise<void>;
  toast: (m: string, t?: "success" | "info") => void;
}) {
  const risk = clause.risk;
  const level: RiskLevel = risk?.level ?? "standard";
  const cls = clause.classification;

  if (state === "accepted") {
    return (
      <AcceptedView
        clause={clause}
        onReopen={() => {
          void resetClauseAction(clause.id);
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
        ACCENT_BORDER[level],
        "hover:border-ink-500",
        isActive && "border-brand-500/50 ring-1 ring-brand-500/30",
        state === "rejected" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 shrink-0">
            §{clause.position}
          </span>
          <h3 className="text-[14px] font-medium text-ink-100 truncate">
            {clause.sectionTitle ||
              (cls ? CATEGORY_LABELS[cls.category] : "Clause")}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {risk && <RiskBadge level={risk.level} />}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-500 transition-transform",
              isActive && "rotate-180",
            )}
          />
        </div>
      </div>

      <p className="text-[13px] text-ink-300 mt-2 leading-relaxed line-clamp-2">
        {risk?.issue || stripCiteTokens(clause.text)}
      </p>

      {risk && risk.confidence !== null && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-ink-500">
            Confidence
          </span>
          <ConfidenceBars confidence={risk.confidence} />
          <span className="text-[11px] text-ink-400 font-[family-name:var(--font-mono)]">
            {Math.round(risk.confidence * 100)}%
          </span>
        </div>
      )}

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
            <ExpandedSections
              contractId={contractId}
              clause={clause}
              state={state}
              setClauseAction={setClauseAction}
              toast={toast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ExpandedSections({
  clause,
  state,
  setClauseAction,
  toast,
}: {
  contractId: string;
  clause: ClauseWorkspaceItem;
  state: ClauseActionState;
  setClauseAction: (
    id: string,
    next: Exclude<ClauseActionState, "pending">,
  ) => Promise<void>;
  toast: (m: string, t?: "success" | "info") => void;
}) {
  const risk = clause.risk;
  const hasRedline = Boolean(risk?.suggestion);
  const isStandard = !risk || risk.level === "low" || risk.level === "standard";

  return (
    <div className="mt-4 pt-4 border-t border-ink-700/60 space-y-4">
      {!isStandard && risk?.explanation && (
        <Section label="Why this matters">
          <p className="text-[13px] leading-relaxed text-ink-300">
            {stripCiteTokens(risk.explanation)}
          </p>
        </Section>
      )}

      {isStandard && (
        <Section label="Why this is fine">
          <p className="text-[13px] leading-relaxed text-ink-300">
            This clause matches our playbook and the 50th-percentile drafting
            in our Indian commercial benchmark corpus. No changes recommended.
          </p>
        </Section>
      )}

      {hasRedline && risk?.suggestion && (
        <Section label="Suggested redline">
          <div className="rounded bg-ink-950/70 border border-ink-700/60 px-3 py-2">
            <p className="text-[13px] text-ink-200 leading-relaxed">
              {stripCiteTokens(risk.suggestion)}
            </p>
          </div>
        </Section>
      )}

      {clause.citations.length > 0 && (
        <Section label="Legal basis">
          <div className="flex flex-wrap gap-1.5">
            {clause.citations.map((c) => (
              <CitationPill key={c.id} citation={c} />
            ))}
          </div>
        </Section>
      )}

      {risk && risk.ruleIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <span className="text-ink-500">Rules matched:</span>
          {risk.ruleIds.slice(0, 4).map((rid) => (
            <span
              key={rid}
              className="inline-flex items-center rounded border border-ink-700/60 px-1.5 py-0.5 text-[10.5px] text-ink-400 font-[family-name:var(--font-mono)]"
            >
              {rid}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hasRedline && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void setClauseAction(clause.id, "accepted");
              toast(`Redline accepted for §${clause.position}`, "success");
            }}
            className="inline-flex items-center gap-1.5 bg-risk-low/15 hover:bg-risk-low/25 text-risk-low text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Accept redline
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void setClauseAction(clause.id, "modified");
            toast("Inline editor coming in next phase");
          }}
          className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-[13px] px-3 py-1.5 rounded-lg transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          Modify
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void setClauseAction(clause.id, "rejected");
            toast(`Suggestion rejected for §${clause.position}`);
          }}
          className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-300 text-[13px] px-2 py-1.5 rounded-lg transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const prompt = `Tell me more about §${clause.position}${
              risk?.issue ? ` — ${risk.issue}` : ""
            }`;
            window.dispatchEvent(
              new CustomEvent("clauseium:ask-ai", { detail: prompt }),
            );
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
  clause: ClauseWorkspaceItem;
  onReopen: () => void;
}) {
  const cls = clause.classification;
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
            §{clause.position}
          </span>
          <span className="text-[13px] font-medium text-ink-100 truncate">
            {clause.sectionTitle ||
              (cls ? CATEGORY_LABELS[cls.category] : "Clause")}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-risk-low ml-auto shrink-0">
            Accepted
          </span>
        </div>
        <p className="text-[12px] text-ink-500 mt-0.5 truncate">
          Redline applied · {clause.risk?.issue ?? "Reviewed"}
        </p>
      </div>
    </article>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const b = RISK_BADGE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
        b.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", b.dot)} />
      {b.label}
    </span>
  );
}

function ConfidenceBars({ confidence }: { confidence: number }) {
  // Render 8 bars; fill proportional to confidence (0–1).
  const filled = Math.max(0, Math.min(8, Math.round(confidence * 8)));
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-[3px] rounded-[1px]",
            i < filled ? "bg-risk-low" : "bg-ink-700",
          )}
        />
      ))}
    </div>
  );
}

function CitationPill({ citation }: { citation: LegalCitation }) {
  const tone = CITATION_TONES[citation.status];
  const label = CITATION_LABELS[citation.status];
  const sectionStripped = citation.section.replace(/^section\s+/i, "").trim();
  const display = sectionStripped
    ? `${citation.source} § ${sectionStripped}`
    : citation.source;
  const linkable =
    citation.url &&
    !/^https?:\/\/(www\.)?indiacode\.nic\.in\/handle\//i.test(citation.url);
  if (linkable) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group inline-flex items-center gap-1.5 border rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${tone}`}
        title={citation.warning ?? `Status: ${label}`}
      >
        <span className="font-[family-name:var(--font-mono)]">{display}</span>
        <span className="text-[9.5px] uppercase tracking-wider opacity-80">
          {label}
        </span>
        <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
      </a>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-md px-2 py-0.5 text-[11px] font-medium ${tone}`}
      title={citation.warning ?? `Status: ${label}`}
    >
      <span className="font-[family-name:var(--font-mono)]">{display}</span>
      <span className="text-[9.5px] uppercase tracking-wider opacity-80">
        {label}
      </span>
    </span>
  );
}

function stripCiteTokens(text: string | null): string {
  if (!text) return "";
  return text.replace(/\s*\[CITE:[^\]]+\]/gi, "").replace(/\s+\./g, ".").trim();
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto bg-ink-800 border border-ink-700 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-2 max-w-sm"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-risk-info shrink-0" />
            )}
            <span className="text-[13px] text-ink-100">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Non-blocking warning rendered above the panes when the contract finalized
// 'ready' but one or more analysis stages degraded/failed. Prevents a partial
// review from being read as a clean "0 high risk" result.
function PartialAnalysisBanner({ notes }: { notes: string[] }) {
  return (
    <div className="shrink-0 bg-risk-med/10 border-b border-risk-med/30 px-4 py-2.5 flex items-start gap-2.5">
      <AlertTriangle className="h-4 w-4 text-risk-med mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-risk-med">
          Partial analysis — results may be incomplete
        </p>
        {notes.length > 0 && (
          <p className="text-[12px] text-ink-300 mt-0.5 leading-relaxed">
            {notes.join(" ")} Re-run the analysis or review this contract
            manually before relying on it.
          </p>
        )}
      </div>
    </div>
  );
}

// Banner rendered when the contract is processing or failed (above the panes).
export function StatusBanner({
  status,
  errorMessage,
}: {
  status: "queued" | "processing" | "failed";
  errorMessage: string | null;
}) {
  if (status === "failed") {
    return (
      <div className="rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 flex items-start gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-risk-high mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-medium text-risk-high">
            Processing failed
          </div>
          {errorMessage && (
            <p className="text-xs text-ink-300 mt-1 font-[family-name:var(--font-mono)] break-all">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-6 flex items-center gap-3 mb-4">
      <Gavel className="h-5 w-5 text-brand-400 animate-pulse shrink-0" />
      <div>
        <div className="text-sm font-medium text-ink-100">
          {status === "queued" ? "Waiting in queue…" : "Parsing document…"}
        </div>
        <p className="text-xs text-ink-500 mt-0.5">
          This page does not auto-refresh — reload to check again.
        </p>
      </div>
    </div>
  );
}

