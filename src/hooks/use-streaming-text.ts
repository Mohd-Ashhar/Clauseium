"use client";

import { useEffect, useState } from "react";

export function useStreamingText(fullText: string, speed: number = 12) {
  const [displayed, setDisplayed] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    setDisplayed("");
    setIsStreaming(true);
    if (!fullText) {
      setIsStreaming(false);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i += 2; // 2 chars per tick — feels like token streaming
      if (i >= fullText.length) {
        setDisplayed(fullText);
        setIsStreaming(false);
        clearInterval(interval);
      } else {
        setDisplayed(fullText.slice(0, i));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [fullText, speed]);

  return { displayed, isStreaming };
}
