"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDelay?: number;
  className?: string;
};

export function TypewriterRotate({
  words,
  typingSpeed = 70,
  deletingSpeed = 50,
  pauseDelay = 2000,
  className,
}: Props) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = words[wordIndex] ?? "";

    if (phase === "typing") {
      if (text.length < current.length) {
        timerRef.current = setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          typingSpeed,
        );
      } else {
        timerRef.current = setTimeout(() => setPhase("pausing"), pauseDelay);
      }
    } else if (phase === "pausing") {
      timerRef.current = setTimeout(() => setPhase("deleting"), 200);
    } else if (phase === "deleting") {
      if (text.length > 0) {
        timerRef.current = setTimeout(
          () => setText(current.slice(0, text.length - 1)),
          deletingSpeed,
        );
      } else {
        setWordIndex((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, phase, wordIndex, words, typingSpeed, deletingSpeed, pauseDelay]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* SEO-safe static fallback */}
      <span className="sr-only">{words[0]}</span>
      <span aria-hidden="true" className="whitespace-pre">
        {text}
      </span>
      <span
        aria-hidden="true"
        className="ml-1 inline-block h-[0.85em] w-[3px] translate-y-[2px] bg-current"
        style={{ animation: "cursor-blink 1s steps(2) infinite" }}
      />
    </span>
  );
}
