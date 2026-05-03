import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, StructuredDocument } from "@/types/ingestion";

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
                  {section.clauses.map((clause) => (
                    <li key={clause.id} className="px-5 py-3 flex gap-4">
                      <span className="text-[11px] text-ink-500 font-[family-name:var(--font-mono)] pt-0.5 shrink-0 w-10">
                        #{clause.position}
                      </span>
                      <p className="text-[13.5px] text-ink-300 leading-relaxed whitespace-pre-wrap">
                        {clause.text}
                      </p>
                    </li>
                  ))}
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
