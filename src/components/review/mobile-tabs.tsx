"use client";

import { useState } from "react";
import { FileText, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentViewer } from "./document-viewer";
import { AnalysisPanel } from "./analysis-panel";
import { AiChatPanel } from "./ai-chat-panel";

type Tab = "doc" | "analysis" | "chat";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "doc", label: "Document", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "analysis", label: "Analysis", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
];

export function MobileTabs() {
  const [tab, setTab] = useState<Tab>("analysis");
  return (
    <div className="h-full flex flex-col min-h-0">
      <nav className="shrink-0 flex border-b border-ink-700 bg-ink-900">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition-colors border-b-2",
                active
                  ? "text-ink-100 border-brand-500"
                  : "text-ink-500 border-transparent hover:text-ink-300",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "doc" && <DocumentViewer />}
        {tab === "analysis" && <AnalysisPanel />}
        {tab === "chat" && <AiChatPanel />}
      </div>
    </div>
  );
}
