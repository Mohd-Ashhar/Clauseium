import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { LegalCitation } from "@/components/resources/legal-citation";
import { ClauseExample } from "@/components/resources/clause-example";
import { DpdpEvent, DpdpTimeline } from "@/components/resources/dpdp-timeline";
import { KeyTakeaways, Takeaway } from "@/components/resources/key-takeaways";
import { TemplateDownloadCTA } from "@/components/resources/template-download-cta";

export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2
      {...props}
      className="mt-12 mb-4 scroll-mt-28 font-display text-[24px] font-semibold tracking-tight text-paper-900"
    />
  ),
  h3: (props) => (
    <h3
      {...props}
      className="mt-8 mb-3 scroll-mt-28 font-display text-[18px] font-semibold text-paper-900"
    />
  ),
  h4: (props) => (
    <h4
      {...props}
      className="mt-6 mb-2 font-display text-[16px] font-semibold text-paper-900"
    />
  ),
  p: (props) => (
    <p
      {...props}
      className="my-5 text-[16px] leading-[1.75] text-paper-900/80"
    />
  ),
  ul: (props) => (
    <ul
      {...props}
      className="my-5 ml-5 list-disc space-y-2 text-[16px] leading-[1.7] text-paper-900/80 marker:text-paper-400"
    />
  ),
  ol: (props) => (
    <ol
      {...props}
      className="my-5 ml-5 list-decimal space-y-2 text-[16px] leading-[1.7] text-paper-900/80 marker:text-paper-500"
    />
  ),
  li: (props) => <li {...props} className="pl-1" />,
  a: ({ href, ...props }) => {
    const isExternal = href?.startsWith("http");
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 underline decoration-brand-500/30 underline-offset-4 transition-colors hover:decoration-brand-500"
          {...props}
        />
      );
    }
    return (
      <Link
        href={href ?? "#"}
        className="text-brand-600 underline decoration-brand-500/30 underline-offset-4 transition-colors hover:decoration-brand-500"
        {...props}
      />
    );
  },
  blockquote: (props) => (
    <blockquote
      {...props}
      className="my-6 rounded-r-lg border-l-4 border-brand-500 bg-brand-50 px-6 py-4 italic text-paper-900/85"
    />
  ),
  code: (props) => (
    <code
      {...props}
      className="rounded-md bg-paper-100 px-1.5 py-0.5 font-mono text-[13.5px] text-paper-900"
    />
  ),
  pre: (props) => (
    <pre
      {...props}
      className="my-6 overflow-x-auto rounded-lg border border-ink-700 bg-ink-900 p-4 font-mono text-[13.5px] leading-relaxed text-ink-100"
    />
  ),
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-paper-200">
      <table {...props} className="w-full border-collapse text-[14.5px]" />
    </div>
  ),
  thead: (props) => <thead {...props} className="bg-paper-100" />,
  th: (props) => (
    <th
      {...props}
      className="border-b border-paper-200 px-4 py-3 text-left font-semibold text-paper-900"
    />
  ),
  td: (props) => (
    <td
      {...props}
      className="border-b border-paper-200 px-4 py-3 align-top text-paper-900/80"
    />
  ),
  tr: (props) => <tr {...props} className="even:bg-paper-50" />,
  hr: () => <hr className="my-10 border-paper-200" />,
  strong: (props) => (
    <strong {...props} className="font-semibold text-paper-900" />
  ),
  em: (props) => <em {...props} className="italic" />,
  LegalCitation,
  ClauseExample,
  DpdpTimeline,
  DpdpEvent,
  TemplateDownloadCTA,
  KeyTakeaways,
  Takeaway,
};
