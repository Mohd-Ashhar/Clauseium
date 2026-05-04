import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, Loader2, Sparkles, ScanLine, ShieldCheck, ShieldAlert, ShieldX, ExternalLink, ShieldQuestion, Gavel } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, StructuredDocument } from "@/types/ingestion";
import type {
  ClassificationLabel,
  ClassificationMethod,
} from "@/lib/classification";
import type { CitationStatus, LegalCitation, RiskLevel } from "@/types/contract";
import type { RiskMethod } from "@/lib/risk";

interface ContractRow {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  page_count: number | null;
  status: JobStatus;
  error_message: string | null;
  structured_json: StructuredDocument | null;
  uploaded_at: string;
  processed_at: string | null;
}

interface ClassificationLookup {
  category: ClassificationLabel;
  confidence: number;
  method: ClassificationMethod;
}

interface CitationLookup {
  citations: LegalCitation[];
  trustScore: number | null;
}

interface RiskLookup {
  level: RiskLevel;
  issue: string | null;
  explanation: string | null;
  suggestion: string | null;
  confidence: number | null;
  method: RiskMethod | null;
  ruleIds: string[];
}

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

const CATEGORY_TONES: Record<ClassificationLabel, string> = {
  indemnification: "bg-risk-high/15 text-risk-high border-risk-high/30",
  limitation_of_liability: "bg-risk-high/15 text-risk-high border-risk-high/30",
  termination: "bg-risk-med/15 text-risk-med border-risk-med/30",
  governing_law: "bg-counsel-500/15 text-counsel-300 border-counsel-500/30",
  jurisdiction: "bg-counsel-500/15 text-counsel-300 border-counsel-500/30",
  data_protection_dpdp: "bg-brand-500/15 text-brand-200 border-brand-500/30",
  payment_terms: "bg-risk-med/15 text-risk-med border-risk-med/30",
  ip_assignment: "bg-counsel-500/15 text-counsel-300 border-counsel-500/30",
  other: "bg-ink-800 text-ink-400 border-ink-700",
};

function confidenceBand(c: number): "High" | "Medium" | "Low" {
  if (c >= 0.85) return "High";
  if (c >= 0.6) return "Medium";
  return "Low";
}

export default async function UploadResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, title, original_filename, mime_type, file_size_bytes, page_count, status, error_message, structured_json, uploaded_at, processed_at",
    )
    .eq("id", id)
    .maybeSingle<ContractRow>();

  if (error || !data) notFound();

  const totalClauses =
    data.structured_json?.sections.reduce((sum, s) => sum + s.clauses.length, 0) ?? 0;

  // Pull classifications for this contract; key by clause position so we can
  // render against the structured_json (which is positional).
  const classificationByPosition = new Map<number, ClassificationLookup>();
  const citationsByPosition = new Map<number, CitationLookup>();
  const riskByPosition = new Map<number, RiskLookup>();
  const categoryCounts = new Map<ClassificationLabel, number>();
  const riskCounts: Record<RiskLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
    standard: 0,
    missing: 0,
  };
  let totalCitations = 0;
  let verifiedCitations = 0;
  let partialCitations = 0;
  let droppedCitations = 0;
  let trustSum = 0;
  let trustCount = 0;
  if (data.status === "ready") {
    const { data: classified } = await supabase
      .from("clauses")
      .select(
        "position, citations, trust_score, verification_log, risk_level, risk_issue, risk_explanation, risk_suggestion, risk_confidence, risk_method, risk_rule_ids, clause_classifications(category, confidence, method, classified_at)",
      )
      .eq("contract_id", id);

    type ClauseWithClf = {
      position: number;
      citations: LegalCitation[] | null;
      trust_score: number | string | null;
      verification_log: unknown[] | null;
      risk_level: RiskLevel | null;
      risk_issue: string | null;
      risk_explanation: string | null;
      risk_suggestion: string | null;
      risk_confidence: number | string | null;
      risk_method: RiskMethod | null;
      risk_rule_ids: string[] | null;
      clause_classifications:
        | {
            category: ClassificationLabel;
            confidence: number | string;
            method: ClassificationMethod;
            classified_at: string;
          }[]
        | null;
    };

    for (const row of (classified ?? []) as ClauseWithClf[]) {
      const list = row.clause_classifications;
      if (list && list.length > 0) {
        const latest = [...list].sort((a, b) =>
          a.classified_at < b.classified_at ? 1 : -1,
        )[0];
        const conf =
          typeof latest.confidence === "string"
            ? Number.parseFloat(latest.confidence)
            : latest.confidence;
        classificationByPosition.set(row.position, {
          category: latest.category,
          confidence: conf,
          method: latest.method,
        });
        if (latest.category !== "other") {
          categoryCounts.set(
            latest.category,
            (categoryCounts.get(latest.category) ?? 0) + 1,
          );
        }
      }

      const cites = Array.isArray(row.citations) ? row.citations : [];
      const trust =
        typeof row.trust_score === "string"
          ? Number.parseFloat(row.trust_score)
          : row.trust_score;
      citationsByPosition.set(row.position, {
        citations: cites,
        trustScore: typeof trust === "number" && Number.isFinite(trust) ? trust : null,
      });

      if (row.risk_level) {
        const riskConf =
          typeof row.risk_confidence === "string"
            ? Number.parseFloat(row.risk_confidence)
            : row.risk_confidence;
        riskByPosition.set(row.position, {
          level: row.risk_level,
          issue: row.risk_issue,
          explanation: row.risk_explanation,
          suggestion: row.risk_suggestion,
          confidence:
            typeof riskConf === "number" && Number.isFinite(riskConf) ? riskConf : null,
          method: row.risk_method,
          ruleIds: Array.isArray(row.risk_rule_ids) ? row.risk_rule_ids : [],
        });
        riskCounts[row.risk_level] = (riskCounts[row.risk_level] ?? 0) + 1;
      }
      if (cites.length > 0 || trust !== null) {
        for (const c of cites) {
          totalCitations += 1;
          if (c.status === "verified") verifiedCitations += 1;
          else if (c.status === "partially_verified") partialCitations += 1;
        }
        // Verification log records a "dropped" count we cannot recompute from
        // surviving citations alone; pull it from the pipeline log entry.
        const log = Array.isArray(row.verification_log) ? row.verification_log : [];
        for (const entry of log) {
          if (
            entry &&
            typeof entry === "object" &&
            (entry as { evt?: string }).evt === "citation.pipeline"
          ) {
            const dropped = (entry as { dropped?: number }).dropped;
            if (typeof dropped === "number") droppedCitations += dropped;
            const extracted = (entry as { extracted?: number }).extracted;
            if (typeof extracted === "number" && extracted > 0) {
              if (typeof trust === "number" && Number.isFinite(trust)) {
                trustSum += trust;
                trustCount += 1;
              }
            }
          }
        }
      }
    }
  }
  const overallTrust = trustCount > 0 ? trustSum / trustCount : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-100 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-ink-100 tracking-tight">
              {data.title}
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              {data.original_filename} · {formatBytes(data.file_size_bytes)}
              {data.page_count ? ` · ${data.page_count} pages` : ""}
            </p>
          </div>
          <StatusPill status={data.status} />
        </div>
      </div>

      {data.status === "failed" && (
        <div className="rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-risk-high mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-risk-high">Processing failed</div>
            {data.error_message && (
              <p className="text-xs text-ink-300 mt-1 font-[family-name:var(--font-mono)] break-all">
                {data.error_message}
              </p>
            )}
          </div>
        </div>
      )}

      {(data.status === "queued" || data.status === "processing") && (
        <div className="rounded-xl border border-ink-700 bg-ink-850 p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-brand-400 animate-spin shrink-0" />
          <div>
            <div className="text-sm font-medium text-ink-100">
              {data.status === "queued" ? "Waiting in queue…" : "Parsing document…"}
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              This page does not auto-refresh — reload to check again.
            </p>
          </div>
        </div>
      )}

      {data.status === "ready" && data.structured_json && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Sections" value={String(data.structured_json.sections.length)} />
            <Stat label="Clauses" value={String(totalClauses)} />
            <Stat label="Pages" value={data.page_count ? String(data.page_count) : "—"} />
            <Stat
              label="Processed"
              value={
                data.processed_at
                  ? new Date(data.processed_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
          </div>

          {classificationByPosition.size > 0 && (
            <div className="rounded-xl border border-ink-700 bg-ink-850 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ScanLine className="h-4 w-4 text-counsel-300" />
                <h2 className="text-sm font-medium text-ink-100">Clause classification</h2>
                <span className="text-[11px] text-ink-500">
                  {classificationByPosition.size} of {totalClauses} clauses labelled
                </span>
              </div>
              {categoryCounts.size > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {[...categoryCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-[11px] font-medium ${CATEGORY_TONES[cat]}`}
                      >
                        {CATEGORY_LABELS[cat]}
                        <span className="text-ink-500/80 font-[family-name:var(--font-mono)]">
                          ×{count}
                        </span>
                      </span>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-ink-500">No target categories detected.</p>
              )}
            </div>
          )}

          {(totalCitations > 0 || droppedCitations > 0) && (
            <CitationSummaryPanel
              verified={verifiedCitations}
              partial={partialCitations}
              dropped={droppedCitations}
              overallTrust={overallTrust}
            />
          )}

          {riskByPosition.size > 0 && (
            <RiskSummaryPanel counts={riskCounts} total={riskByPosition.size} />
          )}

          <div className="space-y-4">
            {data.structured_json.sections.map((section, i) => (
              <section
                key={`${section.title}-${i}`}
                className="bg-ink-850 border border-ink-700 rounded-xl overflow-hidden"
              >
                <header className="bg-ink-900 border-b border-ink-700 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-ink-500 shrink-0" />
                    <h2 className="text-sm font-medium text-ink-100 truncate">{section.title}</h2>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-ink-500 shrink-0">
                    {section.clauses.length} clause{section.clauses.length === 1 ? "" : "s"}
                  </span>
                </header>
                <ol className="divide-y divide-ink-700/50">
                  {section.clauses.map((clause) => {
                    const clf = classificationByPosition.get(clause.position);
                    const cit = citationsByPosition.get(clause.position);
                    const risk = riskByPosition.get(clause.position);
                    return (
                      <li key={clause.id} className="px-5 py-3 flex gap-4">
                        <span className="text-[11px] text-ink-500 font-[family-name:var(--font-mono)] pt-0.5 shrink-0 w-10">
                          #{clause.position}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {(clf || risk || (cit && cit.trustScore !== null)) && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {risk && <RiskBadge level={risk.level} />}
                              {clf && (
                                <>
                                  <span
                                    className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10.5px] font-medium ${CATEGORY_TONES[clf.category]}`}
                                  >
                                    {CATEGORY_LABELS[clf.category]}
                                  </span>
                                  <span className="text-[10.5px] text-ink-500">
                                    {confidenceBand(clf.confidence)} confidence
                                  </span>
                                  {clf.method !== "rule" && (
                                    <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-500">
                                      <Sparkles className="h-3 w-3 text-counsel-300" />
                                      {clf.method === "llm" ? "AI" : "Rule + AI"}
                                    </span>
                                  )}
                                </>
                              )}
                              {cit && cit.trustScore !== null && (
                                <TrustBadge score={cit.trustScore} />
                              )}
                            </div>
                          )}
                          <p className="text-[13.5px] text-ink-300 leading-relaxed whitespace-pre-wrap">
                            {clause.text}
                          </p>
                          {risk && risk.level !== "standard" && (
                            <RiskCard risk={risk} />
                          )}
                          {cit && cit.citations.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {cit.citations.map((c) => (
                                <CitationPill key={c.id} citation={c} />
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { label: string; className: string; icon: React.ReactNode }> = {
    queued: {
      label: "Queued",
      className: "bg-ink-800 text-ink-300 border-ink-700",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    processing: {
      label: "Processing",
      className: "bg-brand-500/15 text-brand-200 border-brand-500/30",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    ready: {
      label: "Ready",
      className: "bg-risk-low/15 text-risk-low border-risk-low/30",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-risk-high/15 text-risk-high border-risk-high/30",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-medium ${c.className}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-850 border border-ink-700 rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-lg font-semibold text-ink-100 mt-0.5">{value}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function trustBand(score: number): {
  label: "High" | "Medium" | "Low";
  tone: string;
  Icon: typeof ShieldCheck;
} {
  if (score >= 0.7) {
    return {
      label: "High",
      tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
      Icon: ShieldCheck,
    };
  }
  if (score >= 0.3) {
    return {
      label: "Medium",
      tone: "bg-risk-med/15 text-risk-med border-risk-med/30",
      Icon: ShieldAlert,
    };
  }
  return {
    label: "Low",
    tone: "bg-risk-high/15 text-risk-high border-risk-high/30",
    Icon: ShieldX,
  };
}

function TrustBadge({ score }: { score: number }) {
  const { label, tone, Icon } = trustBand(score);
  return (
    <span
      title={`Citation trust score: ${score.toFixed(2)}`}
      className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10.5px] font-medium ${tone}`}
    >
      <Icon className="h-3 w-3" />
      Trust {label}
    </span>
  );
}

const CITATION_TONES: Record<CitationStatus, string> = {
  verified: "bg-risk-low/10 text-risk-low border-risk-low/30 hover:border-risk-low/50",
  partially_verified:
    "bg-risk-med/10 text-risk-med border-risk-med/30 hover:border-risk-med/50",
  unverified: "bg-risk-high/10 text-risk-high border-risk-high/30",
};

const CITATION_LABELS: Record<CitationStatus, string> = {
  verified: "verified",
  partially_verified: "partial",
  unverified: "unverified",
};

function CitationPill({ citation }: { citation: LegalCitation }) {
  const tone = CITATION_TONES[citation.status];
  const label = CITATION_LABELS[citation.status];
  const sectionStripped = citation.section.replace(/^section\s+/i, "").trim();
  const display = sectionStripped
    ? `${citation.source} § ${sectionStripped}`
    : citation.source;
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    citation.url ? (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group inline-flex items-center gap-1.5 border rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${tone}`}
        title={citation.warning ?? `Status: ${label}`}
      >
        {children}
        <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
      </a>
    ) : (
      <span
        className={`inline-flex items-center gap-1.5 border rounded-md px-2 py-0.5 text-[11px] font-medium ${tone}`}
        title={citation.warning ?? `Status: ${label}`}
      >
        {children}
      </span>
    );

  return (
    <Wrapper>
      <span className="font-[family-name:var(--font-mono)]">{display}</span>
      <span className="text-[9.5px] uppercase tracking-wider opacity-80">
        {label}
      </span>
    </Wrapper>
  );
}

const RISK_TONES: Record<RiskLevel, { tone: string; label: string; Icon: typeof ShieldCheck }> = {
  high: {
    tone: "bg-risk-high/15 text-risk-high border-risk-high/30",
    label: "High risk",
    Icon: ShieldX,
  },
  medium: {
    tone: "bg-risk-med/15 text-risk-med border-risk-med/30",
    label: "Medium risk",
    Icon: ShieldAlert,
  },
  low: {
    tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
    label: "Low risk",
    Icon: ShieldCheck,
  },
  standard: {
    tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
    label: "Standard",
    Icon: ShieldCheck,
  },
  missing: {
    tone: "bg-risk-info/15 text-risk-info border-risk-info/30",
    label: "Missing",
    Icon: ShieldQuestion,
  },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_TONES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10.5px] font-medium ${cfg.tone}`}
    >
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function stripCiteTokens(text: string | null): string {
  if (!text) return "";
  return text.replace(/\s*\[CITE:[^\]]+\]/gi, "").replace(/\s+\./g, ".").trim();
}

function RiskCard({ risk }: { risk: RiskLookup }) {
  const cfg = RISK_TONES[risk.level];
  const explanation = stripCiteTokens(risk.explanation);
  const suggestion = stripCiteTokens(risk.suggestion);
  return (
    <div
      className={`border-l-2 rounded-md bg-ink-900/60 px-3 py-2.5 mt-1.5 space-y-2 ${
        risk.level === "high"
          ? "border-l-risk-high"
          : risk.level === "medium"
            ? "border-l-risk-med"
            : risk.level === "missing"
              ? "border-l-risk-info"
              : "border-l-risk-low"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Gavel className={`h-3.5 w-3.5 shrink-0 ${cfg.tone.split(" ")[1]}`} />
          <p className="text-[12.5px] font-medium text-ink-100">
            {risk.issue ?? "Risk detected"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {risk.confidence !== null && (
            <span className="text-[10.5px] text-ink-500 font-[family-name:var(--font-mono)]">
              {Math.round(risk.confidence * 100)}%
            </span>
          )}
          {risk.method && risk.method !== "rule" && (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-500">
              <Sparkles className="h-3 w-3 text-counsel-300" />
              {risk.method === "llm" ? "AI" : "Rule + AI"}
            </span>
          )}
        </div>
      </div>
      {explanation && (
        <p className="text-[12px] text-ink-300 leading-relaxed">{explanation}</p>
      )}
      {suggestion && (
        <div className="rounded bg-ink-950/70 border border-ink-700/60 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">
            Suggested redline
          </div>
          <p className="text-[12px] text-ink-200 leading-relaxed">{suggestion}</p>
        </div>
      )}
      {risk.ruleIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {risk.ruleIds.map((rid) => (
            <span
              key={rid}
              className="inline-flex items-center rounded border border-ink-700/60 px-1.5 py-0.5 text-[10px] text-ink-500 font-[family-name:var(--font-mono)]"
            >
              {rid}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskSummaryPanel({
  counts,
  total,
}: {
  counts: Record<RiskLevel, number>;
  total: number;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Gavel className="h-4 w-4 text-counsel-300" />
        <h2 className="text-sm font-medium text-ink-100">Risk analysis</h2>
        <span className="text-[11px] text-ink-500">
          {total} clause{total === 1 ? "" : "s"} analysed
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryStat
          label="High"
          value={String(counts.high)}
          tone="bg-risk-high/15 text-risk-high border-risk-high/30"
        />
        <SummaryStat
          label="Medium"
          value={String(counts.medium)}
          tone="bg-risk-med/15 text-risk-med border-risk-med/30"
        />
        <SummaryStat
          label="Missing"
          value={String(counts.missing)}
          tone="bg-risk-info/15 text-risk-info border-risk-info/30"
        />
        <SummaryStat
          label="Low"
          value={String(counts.low)}
          tone="bg-risk-low/15 text-risk-low border-risk-low/30"
        />
        <SummaryStat
          label="Standard"
          value={String(counts.standard)}
          tone="bg-ink-800 text-ink-300 border-ink-700"
        />
      </div>
      <p className="text-[11px] text-ink-500 mt-3">
        Each clause is checked against deterministic rule packs (uncapped liability, one-sided indemnities, DPDP gaps,
        bad jurisdiction, missing termination protections) and graded against Indian commercial standards.
      </p>
    </div>
  );
}

function CitationSummaryPanel({
  verified,
  partial,
  dropped,
  overallTrust,
}: {
  verified: number;
  partial: number;
  dropped: number;
  overallTrust: number | null;
}) {
  const total = verified + partial + dropped;
  const trustText =
    overallTrust !== null ? `${(overallTrust * 100).toFixed(0)}%` : "—";
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-counsel-300" />
        <h2 className="text-sm font-medium text-ink-100">
          Citation verification
        </h2>
        <span className="text-[11px] text-ink-500">
          {total} citation{total === 1 ? "" : "s"} extracted from AI output
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat
          label="Verified"
          value={String(verified)}
          tone="bg-risk-low/15 text-risk-low border-risk-low/30"
        />
        <SummaryStat
          label="Partial"
          value={String(partial)}
          tone="bg-risk-med/15 text-risk-med border-risk-med/30"
        />
        <SummaryStat
          label="Dropped"
          value={String(dropped)}
          tone="bg-risk-high/15 text-risk-high border-risk-high/30"
        />
        <SummaryStat
          label="Avg trust"
          value={trustText}
          tone="bg-counsel-500/15 text-counsel-300 border-counsel-500/30"
        />
      </div>
      <p className="text-[11px] text-ink-500 mt-3">
        Each AI-generated citation is cross-checked against our local legal corpus
        and Indian Kanoon. Hallucinated citations are dropped before display.
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`border rounded-xl px-4 py-3 ${tone}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
