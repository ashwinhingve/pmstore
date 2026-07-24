'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Upload, Search as SearchIcon } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { BlisterHeroArt } from '@/components/illustrations';
import { SITE_DESCRIPTION } from '@/lib/constants';

const TRUST_CHIPS = ['Licensed pharmacy', 'Government approved', 'Save up to 60% on generics'];

export function Hero() {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : delay },
  });

  return (
    <section className="relative overflow-hidden bg-[image:var(--surface-hero)]">
      {/* Floating blister-pack art — decorative, clipped to the band */}
      <div
        className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 lg:block xl:right-8"
        aria-hidden="true"
      >
        <div className={reduceMotion ? undefined : 'animate-float-slow'}>
          <BlisterHeroArt className="w-[26rem] opacity-70" />
        </div>
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl">
          <motion.h1
            {...fadeUp(0)}
            className="text-balance text-[length:var(--step-3)] text-[var(--paper)]"
          >
            Genuine medicines at honest prices
          </motion.h1>

          <motion.p
            {...fadeUp(0.08)}
            className="mt-5 max-w-xl text-[length:var(--step-0)] leading-relaxed text-[var(--ink-10)]"
          >
            {SITE_DESCRIPTION}
          </motion.p>

          {/* Search — the primary door (docs/03-DESIGN-SYSTEM.md) */}
          <motion.div {...fadeUp(0.16)} className="mt-9">
            <div className="rounded-[var(--radius-lg)] bg-[var(--paper-card)] p-2 shadow-[var(--shadow-hero)]">
              <SearchBar />
            </div>
          </motion.div>

          {/* Primary CTAs */}
          <motion.div {...fadeUp(0.24)} className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--mint)] px-8 font-semibold text-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-[background-color,box-shadow] duration-[var(--dur-fast)] hover:bg-[var(--mint-deep)] hover:shadow-[var(--shadow-md)]"
            >
              <SearchIcon className="mr-2 h-5 w-5" aria-hidden="true" />
              Browse medicines
            </Link>
            <Link
              href="/prescriptions"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--paper)]/30 px-8 font-semibold text-[var(--paper)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--paper)]/60 hover:bg-[var(--paper)]/10"
            >
              <Upload className="mr-2 h-5 w-5" aria-hidden="true" />
              Upload prescription
            </Link>
          </motion.div>

          {/* Trust chips */}
          <motion.ul {...fadeUp(0.32)} className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
            {TRUST_CHIPS.map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-2 text-sm text-[var(--ink-10)]"
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--mint)]"
                  aria-hidden="true"
                />
                {chip}
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
