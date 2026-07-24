'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, RotateCcw, Upload, Search as SearchIcon } from 'lucide-react';
import { Container } from '@/components/shared/Container';

interface QuickActionsProps {
  signedIn: boolean;
}

/**
 * QuickActions — the three doors (docs/03-DESIGN-SYSTEM.md): search,
 * order again (signed in), upload prescription.
 */
export function QuickActions({ signedIn }: QuickActionsProps) {
  const reduceMotion = useReducedMotion();

  const actions = [
    {
      href: '/products',
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
            description: 'Reorder your usual medicines in one tap',
          },
        ]
      : []),
    {
      href: '/prescriptions',
      icon: Upload,
      title: 'Upload prescription',
      description: 'Send a prescription and we build your order',
    },
  ];

  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-14 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : i * 0.08,
                }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="h-full"
              >
                <Link
                  href={action.href}
                  className="group flex h-full flex-col items-start rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] transition-[box-shadow,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--mint)] hover:shadow-[var(--shadow-md)]"
                >
                  <div className="rounded-[var(--radius-md)] bg-[var(--mint-soft)] p-3 text-[var(--mint)] transition-colors duration-[var(--dur-fast)] group-hover:bg-[var(--mint)] group-hover:text-[var(--paper-card)]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                    {action.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-[var(--ink-70)]">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--mint)]">
                    {action.title}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
