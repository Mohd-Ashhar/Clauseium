"use client";

import type { LegalCitation } from "@/types/contract";
import { CitationChip } from "./citation-chip";
import { StreamingText } from "./streaming-text";

export interface ChatMessageData {
  id: string;
  role: "user" | "ai";
  text: string;
  citations?: LegalCitation[];
  streaming?: boolean; // if true, animate; if false, render fully
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-brand-500/15 text-ink-100 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="bg-ink-850 text-ink-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[92%] text-sm space-y-3">
        <div className="leading-relaxed">
          {message.streaming ? (
            <StreamingText text={message.text} />
          ) : (
            <span className="whitespace-pre-wrap">{message.text}</span>
          )}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.citations.map((c) => (
              <CitationChip key={c.id} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
