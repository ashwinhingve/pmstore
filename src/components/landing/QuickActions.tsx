'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { RotateCcw, Upload, Search as SearchIcon } from 'lucide-react';

interface QuickActionsProps {
  signedIn: boolean;
}

/**
 * QuickActions — three premium "doors" for the key user flows.
 * Restyled landing version of the search-first home actions.
 */
export function QuickActions({ signedIn }: QuickActionsProps) {
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const actions = [
    {
      href: '/shop',
      icon: SearchIcon,
      title: 'Search medicines',
      description: 'Find by brand or salt, compare prices per tablet',
    },
    ...(signedIn
      ? [
          {
            href: '/orders',
            icon: RotateCcw,
            title: 'Order again',
            description: 'Reorder your favourite medicines in one tap',
          },
        ]
      : []),
    {
      href: '/prescriptions',
      icon: Upload,
      title: 'Upload prescription',
      description: 'Send a prescription, we build your order',
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                delay: shouldReduceMotion ? 0 : i * 0.1,
              }}
              viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            >
              <Link
                href={action.href}
                className="group flex h-full flex-col items-start rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-card)] transition-all hover:border-[var(--mint)] hover:shadow-lg"
              >
                <div className="rounded-full bg-[var(--mint-soft)] p-3 text-[var(--mint)] group-hover:bg-[var(--mint)] group-hover:text-[var(--paper-card)] transition-colors">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-[var(--ink)] text-[length:var(--step-0)]">
                  {action.title}
                </h3>
                <p className="mt-2 flex-1 text-[0.875rem] text-[var(--ink-70)]">
                  {action.description}
                </p>
                <span className="mt-3 text-[var(--mint)] font-medium text-[0.875rem]">
                  Explore →
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
