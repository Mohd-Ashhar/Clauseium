"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children" | "ref">;

export function FadeUp({
  children,
  delay = 0,
  className,
  ...rest
}: FadeUpProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
