"use client";

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** When true, skips the entrance animation (e.g. for lists of cards). */
  noEnterAnimation?: boolean;
}

export function GlassCard({ children, className, noEnterAnimation = false }: GlassCardProps) {
  return (
    <motion.div
      initial={noEnterAnimation ? false : { opacity: 0, y: 20 }}
      animate={noEnterAnimation ? undefined : { opacity: 1, y: 0 }}
      transition={noEnterAnimation ? undefined : { duration: 0.5, ease: 'easeOut' }}
      className={clsx(
        'bg-glass border border-glass-border rounded-lg shadow-lg backdrop-blur-lg',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
