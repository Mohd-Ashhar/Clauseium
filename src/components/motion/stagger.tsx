"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Stagger({
  children,
  className,
  gap = 0.08,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  amount?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={childVariants}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
