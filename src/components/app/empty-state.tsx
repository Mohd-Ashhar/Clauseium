import { FileText, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { UploadButton } from "./upload-button";

const steps = [
  {
    icon: UploadCloud,
    title: "Upload a contract",
    body: "Drop a vendor MSA, NDA, or employment agreement — PDF or DOCX, up to 50 pages.",
  },
  {
    icon: Sparkles,
    title: "AI flags the risk",
    body: "Every clause checked against your playbook and Indian statutes, with plain-English reasoning and verified citations.",
  },
  {
    icon: FileText,
    title: "Export a redlined Word doc",
    body: "Tracked changes written back into your original .docx — review, accept, and send.",
  },
];

export function EmptyState() {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-8 md:p-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-counsel-500/10 text-counsel-500">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-medium text-ink-100">
          Review your first contract in about 6 minutes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-400">
          Upload a contract and Clauseium returns a clause-by-clause risk review
          with verified citations — and a redlined Word doc you can send.
        </p>
      </div>

      <ol className="mx-auto mt-9 grid max-w-3xl gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="rounded-xl border border-ink-700 bg-ink-900 p-5 text-left"
          >
            <div className="flex items-center gap-2 text-counsel-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-counsel-500/10 text-[12px] font-semibold">
                {i + 1}
              </span>
              <s.icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-[14px] font-medium text-ink-100">
              {s.title}
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col items-center gap-3">
        <UploadButton label="Upload your first contract" className="px-5 py-2.5" />
        <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5 text-counsel-500" />
          Zero data retention with LLM providers · auto-deleted after 30 days
        </p>
      </div>
    </div>
  );
}
