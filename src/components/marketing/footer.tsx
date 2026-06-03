import Link from "next/link";

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2H21l-6.516 7.45L22 22h-6.846l-4.79-6.27L4.8 22H2l6.97-7.96L2 2h7.014l4.34 5.74L18.244 2zm-1.2 18.4h1.84L7.04 3.5H5.08l11.964 16.9z" />
  </svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43A2.06 2.06 0 113.27 5.37c1.14 0 2.07.92 2.07 2.06zm1.78 13.02H3.55V9h3.57v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.23 0z" />
  </svg>
);
interface FooterLink {
  label: string;
  href: string;
}

const product: FooterLink[] = [
  { label: "All Features", href: "/features" },
  { label: "AI Contract Review", href: "/features/contract-review" },
  { label: "DPDP Compliance", href: "/features/dpdp-compliance" },
  { label: "Compare", href: "/compare" },
  { label: "Pricing", href: "/pricing" },
];

const resources: FooterLink[] = [
  { label: "AI Contract Review India", href: "/ai-contract-review-india" },
  { label: "DPDP Compliance India", href: "/dpdp-compliance-india" },
  { label: "Indian Contract Templates", href: "/contract-templates-india" },
  { label: "Clause Library", href: "/resources/clauses" },
  { label: "Glossary", href: "/resources/glossary" },
  { label: "All Resources", href: "/resources" },
];

const company: FooterLink[] = [
  { label: "About", href: "#" },
  { label: "Careers", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Legal Advisory Board", href: "#" },
  { label: "Security", href: "/security" },
  { label: "Privacy & DPDP", href: "/security#dpdp" },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-700/50 bg-ink-950 py-16 text-ink-300">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-display text-[20px] font-bold text-white"
            >
              <span className="text-counsel-500">§</span> Clauseium
            </Link>
            <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-ink-500">
              AI contract review and drafting copilot for Indian in-house
              counsel.
            </p>
            <div className="mt-5 flex gap-4">
              <Link
                href="#"
                aria-label="Twitter"
                className="text-ink-500 transition-colors hover:text-white"
              >
                <TwitterIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                aria-label="LinkedIn"
                className="text-ink-500 transition-colors hover:text-white"
              >
                <LinkedinIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <FooterColumn title="Product" items={product} />
          <FooterColumn title="Resources" items={resources} />
          <FooterColumn title="Company" items={company} />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-ink-700/40 pt-8 text-[12px] text-ink-500 md:flex-row md:items-center">
          <span>© 2026 Clauseium Technologies Pvt Ltd. All rights reserved.</span>
          <span className="text-ink-500/80">
            Built in Bengaluru for India&apos;s in-house counsel.
          </span>
          <span className="max-w-md text-[11px] leading-relaxed text-ink-500/70">
            This platform provides AI-assisted legal information and analysis —
            not a substitute for independent professional judgement.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: FooterLink[];
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500">
        {title}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-[14px] text-ink-300/80 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
