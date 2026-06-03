"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { CheckCircle2, FileText, Loader2, ShieldCheck, UploadCloud, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDialogContextValue {
  open: () => void;
  close: () => void;
}

const UploadDialogContext = createContext<UploadDialogContextValue | null>(null);

export function useUploadDialog(): UploadDialogContextValue {
  const ctx = useContext(UploadDialogContext);
  if (!ctx) throw new Error("useUploadDialog must be used inside <UploadDialogProvider>");
  return ctx;
}

const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 25 * 1024 * 1024;

type Phase = "idle" | "uploading" | "queued" | "processing" | "ready" | "failed";

interface JobState {
  contractId: string;
  phase: Phase;
  message?: string;
}

export function UploadDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value: UploadDialogContextValue = {
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };

  return (
    <UploadDialogContext.Provider value={value}>
      {children}
      <UploadDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </UploadDialogContext.Provider>
  );
}

function UploadDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobState | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setTitle("");
    setError(null);
    setJob(null);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(reset, 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, reset]);

  const onPick = (next: File | null) => {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(next.type)) {
      setError("Only PDF and DOCX files are supported.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("File exceeds 25 MB limit.");
      return;
    }
    setFile(next);
    if (!title.trim()) setTitle(next.name.replace(/\.(pdf|docx)$/i, ""));
  };

  const onSubmit = async () => {
    if (!file) return;
    setError(null);
    setJob({ contractId: "", phase: "uploading" });

    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim() || file.name);

    let res: Response;
    try {
      res = await fetch("/api/contracts/upload", { method: "POST", body: form });
    } catch (err) {
      setJob(null);
      setError(err instanceof Error ? err.message : "Network error");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setJob(null);
      setError(typeof body.message === "string" ? body.message : `Upload failed (${res.status}).`);
      return;
    }

    const { contractId } = (await res.json()) as { contractId: string };
    setJob({ contractId, phase: "queued" });
  };

  // Poll status when we have a contractId in a non-terminal state.
  useEffect(() => {
    if (!job?.contractId || job.phase === "ready" || job.phase === "failed") return;

    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/contracts/${job.contractId}/status`, { cache: "no-store" });
        if (!r.ok || cancelled) return;
        const body = (await r.json()) as {
          status: Phase;
          error_message?: string | null;
        };
        if (cancelled) return;
        setJob((prev) =>
          prev
            ? {
                ...prev,
                phase: body.status,
                message: body.error_message ?? undefined,
              }
            : prev,
        );
      } catch {
        // transient; will retry on next tick
      }
    };

    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [job?.contractId, job?.phase]);

  const onView = () => {
    if (!job?.contractId) return;
    onOpenChange(false);
    router.push(`/dashboard/uploads/${job.contractId}`);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    onPick(dropped);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    onPick(e.target.files?.[0] ?? null);
  };

  const isWorking = job !== null && job.phase !== "ready" && job.phase !== "failed";

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm data-[state=closed]:animate-[fade-out_0.2s] data-[state=open]:animate-[fade-in_0.2s]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
          <div className="flex items-start justify-between p-5 border-b border-ink-700">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-ink-100">
                Upload contract
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-ink-500 mt-0.5">
                PDF or DOCX, up to 25 MB. We&apos;ll extract sections and clauses automatically.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-ink-500 hover:text-ink-100 transition-colors">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="p-5 space-y-4">
            {!job && (
              <>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors px-6 py-10 text-center",
                    dragOver
                      ? "border-counsel-500 bg-counsel-500/5"
                      : "border-ink-700 hover:border-ink-500 bg-ink-850/50",
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={handleInput}
                  />
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-counsel-400" />
                      <div className="text-sm text-ink-100 font-medium">{file.name}</div>
                      <div className="text-xs text-ink-500">{formatBytes(file.size)}</div>
                      <div className="text-[11px] text-ink-500 mt-1">
                        Click or drop to choose a different file
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-ink-500" />
                      <div className="text-sm text-ink-300">
                        <span className="text-counsel-400 font-medium">Click to browse</span> or drop
                        a file here
                      </div>
                      <div className="text-[11px] text-ink-500">PDF · DOCX · 25 MB max</div>
                    </>
                  )}
                </label>

                <div className="space-y-1.5">
                  <label
                    htmlFor="upload-title"
                    className="text-[12px] uppercase tracking-wider text-ink-500 font-medium"
                  >
                    Title
                  </label>
                  <input
                    id="upload-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mutual NDA — Razorpay Software"
                    className="w-full bg-ink-850 border border-ink-700 hover:border-ink-500 focus:border-counsel-500 focus:outline-none focus:ring-1 focus:ring-counsel-500/30 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 transition-colors"
                  />
                </div>
              </>
            )}

            {job && <JobProgress job={job} onView={onView} />}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm text-risk-high">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-ink-700">
            <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-500">
              <ShieldCheck className="h-3.5 w-3.5 text-counsel-500" />
              Zero retention with LLMs · auto-deleted in 30 days
            </p>
            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isWorking}
              className="text-sm text-ink-300 hover:text-ink-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {job?.phase === "ready" ? "Close" : "Cancel"}
            </button>
            {!job && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!file}
                className="inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 disabled:opacity-50 disabled:cursor-not-allowed text-ink-950 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              >
                Upload
              </button>
            )}
            {job?.phase === "ready" && (
              <button
                type="button"
                onClick={onView}
                className="inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              >
                View result
              </button>
            )}
            {job?.phase === "failed" && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              >
                Try again
              </button>
            )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function JobProgress({ job, onView }: { job: JobState; onView: () => void }) {
  const steps: { phase: Phase; label: string }[] = [
    { phase: "uploading", label: "Uploading" },
    { phase: "queued", label: "Queued" },
    { phase: "processing", label: "Analyzing clauses and risk" },
    { phase: "ready", label: "Review ready" },
  ];
  const order: Phase[] = ["uploading", "queued", "processing", "ready"];
  const currentIdx = order.indexOf(job.phase);

  if (job.phase === "failed") {
    return (
      <div className="rounded-lg border border-risk-high/30 bg-risk-high/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-risk-high font-medium text-sm">
          <AlertTriangle className="h-4 w-4" />
          Processing failed
        </div>
        {job.message && <p className="text-xs text-ink-300">{job.message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const done = i < currentIdx || job.phase === "ready";
        const active = i === currentIdx && job.phase !== "ready";
        return (
          <div
            key={step.phase}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              active && "bg-counsel-500/10 text-ink-100",
              done && "text-ink-300",
              !done && !active && "text-ink-500",
            )}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
            ) : active ? (
              <Loader2 className="h-4 w-4 animate-spin text-counsel-400 shrink-0" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-ink-700 shrink-0" />
            )}
            {step.label}
          </div>
        );
      })}
      {job.phase === "ready" && (
        <button
          type="button"
          onClick={onView}
          className="w-full text-sm font-medium text-counsel-300 hover:text-counsel-200 transition-colors pt-1"
        >
          Open your review →
        </button>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
