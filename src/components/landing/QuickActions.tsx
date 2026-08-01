'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, RotateCcw, Upload, PackageSearch, Search as SearchIcon } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  signedIn: boolean;
}

/**
 * QuickActions — the doors into the store (docs/03-DESIGN-SYSTEM.md): search,
 * order again (signed in), upload prescription, and custom order. The custom-order
 * card is highlighted (brand-tinted) because it's a client priority.
 */
export function QuickActions({ signedIn }: QuickActionsProps) {
  const reduceMotion = useReducedMotion();

  const actions = [
    {
      href: '/products',
      icon: SearchIcon,
      title: 'Search medicines',
      description: 'Find by brand or salt, compare prices per tablet',
      cta: 'Browse medicines',
      highlight: false,
    },
    ...(signedIn
      ? [
          {
            href: '/orders',
            icon: RotateCcw,
            title: 'Order again',
            description: 'Reorder your usual medicines in one tap',
            cta: 'Reorder',
            highlight: false,
          },
        ]
      : []),
    {
      href: '/prescriptions',
      icon: Upload,
      title: 'Upload prescription',
      description: 'Send a prescription and we build your order',
      cta: 'Upload prescription',
      highlight: false,
    },
    {
      href: '/custom-order',
      icon: PackageSearch,
      title: 'Custom order',
      description: "Can't find it? Tell us and we source it for you",
      cta: 'Request a medicine',
      highlight: true,
    },
  ];

  // Static class strings so Tailwind keeps them (grid width tracks the card count).
  const gridCols = actions.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-16 sm:py-24">
        <SectionHeading
          align="center"
          eyebrow="Get started"
          title="Everything in a couple of taps"
          description="Four quick ways in — search, reorder, upload a prescription, or ask us to source it"
          className="mb-10"
        />

        <div className={cn('grid gap-4 sm:grid-cols-2', gridCols)}>
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
                  className={cn(
                    'group relative flex h-full flex-col items-start overflow-hidden rounded-[var(--radius-lg)] border p-6 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)]',
                    action.highlight
                      ? 'border-[var(--brand)]/40 bg-[var(--brand-tint)] ring-1 ring-[var(--brand)]/20'
                      : 'border-[var(--foil-soft)] bg-[var(--paper-card)]',
                  )}
                >
                  {/* Faint oversized icon watermark for depth, echoing the catalogue tiles. */}
                  <Icon
                    className="pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 text-[var(--brand)] opacity-[0.06] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-110"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                  {action.highlight && (
                    <span className="absolute right-4 top-4 rounded-[var(--radius-pill)] bg-[var(--brand)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-ink)] shadow-[var(--shadow-xs)]">
                      Popular
                    </span>
                  )}
                  <div className="relative flex h-full w-full flex-col items-start">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[image:var(--surface-brand)] text-[var(--brand-ink)] shadow-[var(--shadow-xs)]">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--step-1)] font-extrabold tracking-tight text-[var(--ink)]">
                      {action.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--ink-70)]">{action.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-deep)]">
                      {action.cta}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
