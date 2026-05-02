"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { GitCompare, MessageSquare, Search } from "lucide-react";
import { useReview } from "./review-context";

interface ToolbarPos {
  top: number;
  left: number;
}

export function SelectionToolbar({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const { toast } = useReview();
  const [pos, setPos] = useState<ToolbarPos | null>(null);
  const [text, setText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container) return;
      // Verify selection is inside our document container.
      if (!container.contains(range.commonAncestorContainer as Node)) {
        setPos(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPos(null);
        return;
      }
      setText(sel.toString().trim());
      setPos({
        top: rect.top - containerRect.top - 44,
        left: rect.left - containerRect.left + rect.width / 2,
      });
    };

    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [containerRef]);

  if (!pos || !text) return null;

  const askAi = () => {
    const event = new CustomEvent("clauseium:ask-ai", {
      detail: `Help me understand this clause: "${text.slice(0, 200)}${text.length > 200 ? "…" : ""}"`,
    });
    window.dispatchEvent(event);
    setPos(null);
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute z-20 bg-ink-800 border border-ink-700 rounded-lg px-2 py-1.5 flex gap-1 shadow-xl pointer-events-auto"
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolbarButton onClick={askAi} icon={<MessageSquare className="h-3.5 w-3.5" />}>
        Ask AI
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          toast("Playbook comparison coming in next phase");
          setPos(null);
        }}
        icon={<GitCompare className="h-3.5 w-3.5" />}
      >
        Compare
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          toast("Similar clause search coming in next phase");
          setPos(null);
        }}
        icon={<Search className="h-3.5 w-3.5" />}
      >
        Find similar
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-ink-300 hover:bg-ink-700 hover:text-ink-100 text-[12px] transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}
