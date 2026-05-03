"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import { AnimatePresence } from "framer-motion";
import type { Contract } from "@/types/contract";
import { useSidebar } from "@/components/app/sidebar-context";
import { ReviewProvider } from "./review-context";
import { ReviewTopBar } from "./review-top-bar";
import { DocumentViewer } from "./document-viewer";
import { AnalysisPanel } from "./analysis-panel";
import { AiChatPanel } from "./ai-chat-panel";
import { ReviewLoading } from "./review-loading";
import { CitationDrawer } from "./citation-drawer";
import { ExportDialog } from "./export-dialog";
import { MobileTabs } from "./mobile-tabs";

export function ReviewWorkspace({ contract }: { contract: Contract }) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const searchParams = useSearchParams();
  const isDemo = searchParams?.get("demo") === "1";
  const [showLoading, setShowLoading] = useState(false);

  // Auto-collapse the app sidebar on mount.
  useEffect(() => {
    if (!collapsed) toggleCollapsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the analyzing-loader on first visit per contract (or whenever ?demo=1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `clauseium:hasSeenLoading:${contract.id}`;
    if (isDemo || !window.localStorage.getItem(key)) {
      setShowLoading(true);
      window.localStorage.setItem(key, "1");
    }
  }, [contract.id, isDemo]);

  return (
    <ReviewProvider contract={contract}>
      <div className="-mx-6 -my-6 h-[calc(100vh-3.5rem)] flex flex-col bg-ink-950">
        <ReviewTopBar />

        {/* Desktop: resizable two-pane */}
        <div className="hidden lg:flex flex-1 min-h-0">
          <Group orientation="horizontal" className="flex-1 flex">
            <Panel defaultSize="55%" minSize="35%" maxSize="70%" className="min-w-0">
              <DocumentViewer />
            </Panel>
            <Separator className="w-1 bg-ink-700 hover:bg-brand-500 data-[resize-state=dragging]:bg-brand-500 transition-colors cursor-col-resize" />
            <Panel defaultSize="45%" minSize="30%" maxSize="65%" className="min-w-0">
              <Group orientation="vertical" className="flex flex-col h-full">
                <Panel defaultSize="70%" minSize="30%" className="min-h-0">
                  <AnalysisPanel />
                </Panel>
                <Separator className="h-1 bg-ink-700 hover:bg-brand-500 data-[resize-state=dragging]:bg-brand-500 transition-colors cursor-row-resize" />
                <Panel defaultSize="30%" minSize="20%" maxSize="70%" className="min-h-0">
                  <AiChatPanel />
                </Panel>
              </Group>
            </Panel>
          </Group>
        </div>

        {/* Mobile: tabs */}
        <div className="lg:hidden flex-1 min-h-0">
          <MobileTabs />
        </div>

        <CitationDrawer />
        <ExportDialog />

        <AnimatePresence>
          {showLoading && <ReviewLoading onDone={() => setShowLoading(false)} />}
        </AnimatePresence>
      </div>
    </ReviewProvider>
  );
}
