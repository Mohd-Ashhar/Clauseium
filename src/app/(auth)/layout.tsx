import Link from "next/link";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { FadeUp } from "@/components/motion/fade-up";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 font-sans">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <BrandPanel />
        <main className="relative flex flex-col">
          <header className="flex items-center justify-between px-6 py-5 lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[18px] font-bold">
              <span className="text-counsel-400">§</span>
              <span>Clauseium</span>
            </Link>
            <Link
              href="/"
              className="text-[13px] font-medium text-ink-400 hover:text-ink-100"
            >
              Back home
            </Link>
          </header>
          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
            <FadeUp className="w-full max-w-[420px]">{children}</FadeUp>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-6 pb-6 text-[12px] text-ink-500">
            <Lock className="h-3 w-3" />
            <span>Zero data retention · DPDP-aligned ·</span>
            <Link href="/security" className="font-medium text-counsel-500 hover:text-counsel-400">
              See our security
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-ink-800 bg-ink-950 lg:block">
      <AuroraBackground intensity="dim" />
      <div className="relative flex h-full flex-col justify-between p-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-[20px] font-bold tracking-tight text-ink-100"
        >
          <span className="text-counsel-400">§</span>
          <span>Clauseium</span>
        </Link>

        <div className="max-w-[420px] space-y-6">
          <p className="font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.15] tracking-tight text-ink-100">
            Review contracts in minutes. Ship redlines with citations.
          </p>
          <p className="text-[15px] leading-relaxed text-ink-400">
            Clauseium is the AI copilot built for Indian in-house counsel — DPDP-aware,
            playbook-aligned, and trained on the law that matters.
          </p>
          <ul className="space-y-2.5 text-[13px] text-ink-300">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-counsel-400" />
              Verified citations against Indian statutes
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-counsel-500" />
              DPDP, Contract Act &amp; Arbitration Act coverage
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-risk-info" />
              Zero data retention with LLM providers
            </li>
          </ul>
        </div>

        <p className="text-[12px] text-ink-500">
          © {new Date().getFullYear()} Clauseium · Provides legal information and analysis, not a substitute for professional judgement.
        </p>
      </div>
    </aside>
  );
}
