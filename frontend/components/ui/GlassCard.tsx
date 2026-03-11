"use client";

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={clsx(
        'bg-glass border border-glass-border rounded-lg shadow-lg backdrop-blur-lg',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
