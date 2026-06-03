"use client";

import { Menu, Plus, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useUploadDialog } from "./upload-dialog";

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  contracts: "Contracts",
  inbox: "Inbox",
  playbooks: "Playbooks",
  library: "Library",
  reviews: "Active Reviews",
  drafts: "Drafts",
  templates: "Templates",
  analytics: "Analytics",
  reports: "Reports",
  audit: "Audit Log",
  settings: "Settings",
  team: "Team",
  integrations: "Integrations",
  compliance: "Compliance",
  billing: "Billing",
};

function buildBreadcrumb(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [{ label: "Workspace" }];
  let acc = "";
  for (const seg of parts) {
    acc += "/" + seg;
    crumbs.push({
      label: segmentLabels[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
      href: acc,
    });
  }
  return crumbs;
}

export function TopBar() {
  const { setMobileOpen } = useSidebar();
  const { open: openUpload } = useUploadDialog();
  const pathname = usePathname() ?? "/dashboard";
  const crumbs = buildBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-30 h-14 bg-ink-900/80 backdrop-blur-md border-b border-ink-700 flex items-center px-4 gap-3 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden h-8 w-8 flex items-center justify-center rounded text-ink-500 hover:text-ink-100 hover:bg-ink-850"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="flex items-center gap-2 text-[13px] min-w-0" aria-label="Breadcrumb">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-2 min-w-0">
                <span
                  className={
                    last ? "text-ink-100 font-medium truncate" : "text-ink-500 truncate"
                  }
                >
                  {c.label}
                </span>
                {!last && <span className="text-ink-700">/</span>}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Center: command palette trigger */}
      <div className="flex-1 flex justify-center">
        <button
          className="hidden md:flex items-center gap-2 bg-ink-850 border border-ink-700 hover:border-ink-500 rounded-lg px-4 py-1.5 text-sm text-ink-500 transition-colors min-w-[280px] max-w-[420px] w-full"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search contracts, clauses, parties…</span>
          <span className="bg-ink-800 text-ink-500 text-[10px] font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded">
            ⌘K
          </span>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={openUpload}
          className="h-9 inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium px-3.5 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Contract</span>
        </button>
      </div>
    </header>
  );
}
