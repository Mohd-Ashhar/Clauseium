"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Props = {
  to: number;
  duration?: number;
  decimals?: number;
  format?: (n: number) => string;
  className?: string;
};

export function CountUp({
  to,
  duration = 1.6,
  decimals = 0,
  format,
  className,
}: Props) {
  const [value, setValue] = useState(0);
  const [start, setStart] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setStart(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const startTime = performance.now();
    const tick = (t: number) => {
      const elapsed = (t - startTime) / 1000;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(eased * to);
      if (p < 1) requestAnimationFrame(tick);
      else setValue(to);
    };
    requestAnimationFrame(tick);
  }, [start, to, duration, reduce]);

  const display = format
    ? format(value)
    : value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
