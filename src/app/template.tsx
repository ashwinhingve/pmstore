'use client';

import { motion } from 'framer-motion';

/**
 * Page transition wrapper. Respects prefers-reduced-motion;
 * fade in/out on route change for a smooth landing experience.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      {children}
    </motion.div>
  );
}
