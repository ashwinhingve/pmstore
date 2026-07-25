'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type ToastItem } from '@/store/useToastStore';

/**
 * Toast notifications. Bottom-centre on phones (thumb reach), top-right from
 * sm up. Errors use ink — `--rx` red is for prescription flags only, never
 * errors (src/components/CLAUDE.md).
 */

const VARIANT_STYLES: Record<ToastItem['variant'], { surface: string; icon: string }> = {
  success: { surface: 'border-[var(--mint)] bg-[var(--mint-soft)]', icon: 'text-[var(--mint)]' },
  error: { surface: 'border-[var(--ink)] bg-[var(--paper-card)]', icon: 'text-[var(--ink)]' },
  info: { surface: 'border-[var(--foil)] bg-[var(--paper-tint)]', icon: 'text-[var(--ink-70)]' },
};

const VARIANT_ICONS: Record<ToastItem['variant'], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = VARIANT_ICONS[t.variant];
          return (
            <motion.div
              key={t.id}
              layout={!reduceMotion}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.12 } }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-3 shadow-[var(--shadow-lg)]',
                VARIANT_STYLES[t.variant].surface
              )}
            >
              <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', VARIANT_STYLES[t.variant].icon)} />
              <p className="flex-1 text-[0.875rem] font-medium leading-snug text-[var(--ink)]">
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="relative -m-1 shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--ink-40)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--ink)] after:absolute after:-inset-3 after:content-['']"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
