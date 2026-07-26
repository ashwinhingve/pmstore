'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Upload, Search as SearchIcon, ShieldCheck, Truck, BadgeIndianRupee } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { HeroCarousel, type HeroSlideView } from '@/components/landing/HeroCarousel';
import { SITE_DESCRIPTION, SITE_TAGLINE } from '@/lib/constants';

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'Licensed & government approved' },
  { icon: BadgeIndianRupee, label: 'Save up to 60% on generics' },
  { icon: Truck, label: 'Free home delivery in Bhopal' },
];

export function Hero({ slides }: { slides?: HeroSlideView[] }) {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : delay },
  });

  return (
    <section className="relative overflow-hidden bg-[var(--paper)]">
      {/* Soft light depth — mint/paper glows on the warm paper surface. Decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--mint)]/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[var(--paper-tint-mint)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--foil-soft)]" />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8 lg:py-24">
        {/* Left — the words and the primary door (search) */}
        <div className="max-w-2xl">
          <motion.p
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-1.5 text-sm font-medium text-[var(--ink-70)] shadow-[var(--shadow-xs)]"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--mint)]" aria-hidden="true" />
            {SITE_TAGLINE}
          </motion.p>

          <motion.h1
            {...fadeUp(0.06)}
            className="mt-5 text-balance text-[length:var(--step-4)] font-extrabold leading-[1.05] text-[var(--ink)]"
          >
            Genuine medicines at{' '}
            <span className="text-[var(--mint)]">honest prices</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.12)}
            className="mt-5 max-w-xl text-pretty text-[length:var(--step-0)] leading-relaxed text-[var(--ink-70)]"
          >
            {SITE_DESCRIPTION}
          </motion.p>

          {/* Search — the primary door (docs/03-DESIGN-SYSTEM.md) */}
          <motion.div {...fadeUp(0.18)} className="mt-8">
            <div className="rounded-[var(--radius-lg)] bg-[var(--paper-card)] p-2 shadow-[var(--shadow-feature)] ring-1 ring-[var(--foil-soft)]">
              <SearchBar />
            </div>
            <p className="mt-2 pl-1 text-xs text-[var(--ink-40)]">
              Try a brand like <span className="data">Dolo 650</span> or a salt like{' '}
              <span className="data">paracetamol</span>
            </p>
          </motion.div>

          {/* Primary CTAs */}
          <motion.div {...fadeUp(0.24)} className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--mint)] px-8 font-semibold text-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-[background-color,box-shadow,transform] duration-[var(--dur-fast)] hover:bg-[var(--mint-deep)] hover:shadow-[var(--shadow-md)] active:translate-y-px"
            >
              <SearchIcon className="mr-2 h-5 w-5" aria-hidden="true" />
              Browse medicines
            </Link>
            <Link
              href="/prescriptions"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-8 font-semibold text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--foil)] hover:bg-[var(--foil-soft)]"
            >
              <Upload className="mr-2 h-5 w-5" aria-hidden="true" />
              Upload prescription
            </Link>
          </motion.div>

          {/* Trust chips */}
          <motion.ul {...fadeUp(0.3)} className="mt-9 flex flex-wrap gap-2.5">
            {TRUST_CHIPS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-1.5 text-sm text-[var(--ink-70)]"
              >
                <Icon className="h-4 w-4 text-[var(--mint)]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Right — sliding image carousel (admin-managed, with a photo fallback).
            Decorative; the page's meaning lives in the text and search. */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.2 }}
          className="relative mx-auto hidden w-full max-w-md lg:block"
        >
          {/* Savings badge — mint is the savings colour (never --rx) */}
          <div className="absolute -left-5 top-10 z-20 rounded-[var(--radius-lg)] bg-[var(--paper-card)] p-4 text-center shadow-[var(--shadow-lg)] ring-1 ring-[var(--foil-soft)]">
            <p className="price text-[length:var(--step-3)] font-bold leading-none text-[var(--mint)]">60%</p>
            <p className="mt-1 text-xs font-medium leading-tight text-[var(--ink-70)]">
              average saving
              <br />
              with generics
            </p>
          </div>

          <HeroCarousel slides={slides} />
        </motion.div>
      </div>
    </section>
  );
}
