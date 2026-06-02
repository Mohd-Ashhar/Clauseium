import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Frontmatter } from "@/lib/content";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43A2.06 2.06 0 113.27 5.37c1.14 0 2.07.92 2.07 2.06zm1.78 13.02H3.55V9h3.57v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

function initials(name: string) {
  return name
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AuthorMetaInline({
  author,
  publishedAt,
  updatedAt,
  readingMinutes,
}: {
  author: Frontmatter["author"];
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-300">
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-counsel-500/20 font-mono text-[10px] font-semibold text-counsel-200">
          {initials(author.name) || "C"}
        </span>
        <span className="text-white">{author.name}</span>
      </span>
      <span className="text-ink-500">·</span>
      <span>{author.role}</span>
      <span className="text-ink-500">·</span>
      <time dateTime={updatedAt ?? publishedAt}>
        {updatedAt ? "Updated " : ""}
        {formatDate(updatedAt ?? publishedAt)}
      </time>
      <span className="text-ink-500">·</span>
      <span>{readingMinutes} min read</span>
    </div>
  );
}

export function AuthorCard({
  author,
  publishedAt,
  updatedAt,
  variant = "full",
}: {
  author: Frontmatter["author"];
  publishedAt: string;
  updatedAt?: string;
  variant?: "full" | "compact";
}) {
  const reviewedDate = formatDate(updatedAt ?? publishedAt);

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-paper-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-counsel-100 font-mono text-[12px] font-semibold text-counsel-600">
            {initials(author.name) || "C"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-paper-900">
              {author.name}
            </div>
            <div className="truncate text-[12px] text-paper-600">{author.role}</div>
          </div>
        </div>
        {author.enrollment && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-paper-100 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-counsel-600" />
            <span className="font-mono text-[10.5px] leading-snug text-paper-700">
              {author.enrollment}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="mt-16 rounded-2xl border border-paper-200 bg-white p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-counsel-100 font-mono text-[20px] font-semibold text-counsel-600">
          {initials(author.name) || "C"}
        </span>
        <div className="flex-1">
          <div className="font-display text-[20px] font-semibold text-paper-900">
            {author.name}
          </div>
          <div className="text-[14px] text-paper-600">{author.role}</div>
          {author.enrollment && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-counsel-600" />
              <span className="font-mono text-[11px] text-counsel-600">
                {author.enrollment}
              </span>
            </div>
          )}
          {author.bio && (
            <p className="mt-4 text-[14.5px] leading-relaxed text-paper-700">
              {author.bio}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-paper-500">
            <span>Reviewed and verified on {reviewedDate}</span>
            {author.linkedin && (
              <Link
                href={author.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-paper-700 transition-colors hover:text-counsel-600"
              >
                <LinkedinIcon className="h-3.5 w-3.5" />
                LinkedIn
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
