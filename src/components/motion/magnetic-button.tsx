"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  range?: number;
  pull?: number;
};

export function MagneticButton({
  children,
  className,
  range = 60,
  pull = 0.08,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > rect.width / 2 + range) {
      x.set(0);
      y.set(0);
      return;
    }
    x.set(dx * pull);
    y.set(dy * pull);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: springX, y: springY }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}
