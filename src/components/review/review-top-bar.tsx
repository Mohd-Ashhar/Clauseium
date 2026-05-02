"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  ChevronLeft,
  Download,
  MoreHorizontal,
  Printer,
  Share2,
} from "lucide-react";
import { useReview } from "./review-context";
import { contractTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ReviewTopBar() {
  const { contract, setExportOpen, toast } = useReview();
  const [menuOpen, setMenuOpen] = useState(false);

  const r = contract.riskSummary;

  return (
    <header className="h-14 shrink-0 bg-ink-900 border-b border-ink-700 flex items-center px-3 gap-3">
      {/* Left: back + title */}
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
            title={contract.title}
          >
            {contract.title}
          </span>
          <span className="bg-ink-800 text-ink-400 text-xs px-2 py-0.5 rounded font-[family-name:var(--font-mono)] shrink-0">
            v{contract.version}
          </span>
        </div>
      </div>

      {/* Center: status chips (hidden on smaller screens) */}
      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
        <Chip>{contract.counterparty}</Chip>
        <Chip>{contractTypeLabel(contract.contractType)}</Chip>
        <Chip>{contract.jurisdiction}</Chip>
      </div>

      {/* Right: risk pills + export + menu */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1.5">
          {r.high > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-high/15 text-risk-high">
              {r.high} High
            </span>
          )}
          {r.medium > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-med/15 text-risk-med">
              {r.medium} Med
            </span>
          )}
          {r.standard > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-low/15 text-risk-low">
              {r.standard} Std
            </span>
          )}
        </div>

        <button
          onClick={() => setExportOpen(true)}
          className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export Redlined Word</span>
          <span className="sm:hidden">Export</span>
        </button>

        <div className="relative">
          <button
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
    <span className="bg-ink-850 border border-ink-700 text-ink-400 text-xs px-2.5 py-1 rounded-full">
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
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-300 hover:bg-ink-850 hover:text-ink-100 transition-colors",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
