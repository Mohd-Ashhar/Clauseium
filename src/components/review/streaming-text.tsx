"use client";

import { useStreamingText } from "@/hooks/use-streaming-text";
import { cn } from "@/lib/utils";

export function StreamingText({ text, className }: { text: string; className?: string }) {
  const { displayed, isStreaming } = useStreamingText(text);
  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {displayed}
      {isStreaming && (
        <span className="inline-block w-[2px] h-[1em] align-text-bottom bg-brand-500 animate-pulse ml-[1px]" />
      )}
    </span>
  );
}
