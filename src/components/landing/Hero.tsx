'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Upload, Search as SearchIcon } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { VALUE_PROPS, SITE_DESCRIPTION } from '@/lib/constants';

const shouldReduceMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--paper)] via-[var(--paper-card)] to-[var(--foil-soft)]">
      {/* Subtle animated gradient backdrop */}
      <motion.div
        className="absolute inset-0 opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: shouldReduceMotion ? 0 : 0.3 }}
        transition={{ duration: 0.8 }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--mint-soft)] via-transparent to-[var(--foil-soft)]" />
      </motion.div>

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
        >
          {/* Hero headline */}
          <h1 className="text-[length:var(--step-3)] font-[900] leading-tight tracking-tight text-[var(--ink)]">
            Genuine medicines at honest prices
          </h1>

          {/* Subheading from site description */}
          <p className="mx-auto mt-6 max-w-2xl text-[length:var(--step-0)] leading-relaxed text-[var(--ink-70)]">
            {SITE_DESCRIPTION}
          </p>

          {/* Trust chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['Government approved', 'Licensed pharmacy', 'Free delivery'].map((chip) => (
              <motion.div
                key={chip}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--foil)] bg-[var(--paper-card)] px-4 py-2 text-[0.875rem] text-[var(--ink-70)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--mint)]" />
                {chip}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Prominent search bar */}
        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : 0.2 }}
        >
          <div className="w-full max-w-2xl">
            <SearchBar />
          </div>
        </motion.div>

        {/* Primary CTAs */}
        <motion.div
          className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.3 }}
        >
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--mint)] px-8 font-semibold text-[var(--paper-card)] transition-opacity hover:opacity-90"
          >
            <SearchIcon className="mr-2 h-5 w-5" aria-hidden="true" />
            Shop medicines
          </Link>
          <Link
            href="/prescriptions"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--paper-card)] px-8 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--foil-soft)]"
          >
            <Upload className="mr-2 h-5 w-5" aria-hidden="true" />
            Upload prescription
          </Link>
        </motion.div>

        {/* Hero illustration — self-contained SVG (no external image dependency) */}
        <motion.div
          className="mt-16 overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-gradient-to-br from-[var(--mint-soft)] via-[var(--paper-card)] to-[var(--foil-soft)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.4 }}
        >
          <svg
            viewBox="0 0 1200 380"
            role="img"
            aria-label="Illustration of assorted medicines"
            className="block h-auto w-full"
          >
            <defs>
              <pattern id="pmHeroDots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="2.2" className="fill-[var(--foil)]" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="1200" height="380" fill="url(#pmHeroDots)" />

            {/* Capsule — mint + white */}
            <g transform="translate(250 130) rotate(-20)">
              <rect x="-95" y="-27" width="190" height="54" rx="27" className="fill-[var(--paper-card)] stroke-[var(--foil)]" strokeWidth="2" />
              <path d="M -95 -27 h95 v54 h-95 a27 27 0 0 1 0 -54 z" className="fill-[var(--mint)]" />
            </g>

            {/* Capsule — ink + white */}
            <g transform="translate(950 250) rotate(15)">
              <rect x="-85" y="-24" width="170" height="48" rx="24" className="fill-[var(--paper-card)] stroke-[var(--foil)]" strokeWidth="2" />
              <path d="M 0 -24 h85 a24 24 0 0 1 0 48 h-85 z" className="fill-[var(--ink)]" />
            </g>

            {/* Scored round pills */}
            <g>
              <circle cx="600" cy="150" r="46" className="fill-[var(--mint-soft)] stroke-[var(--mint)]" strokeWidth="2.5" />
              <line x1="554" y1="150" x2="646" y2="150" className="stroke-[var(--mint)]" strokeWidth="2.5" />
            </g>
            <g>
              <circle cx="470" cy="272" r="34" className="fill-[var(--paper-card)] stroke-[var(--foil)]" strokeWidth="2.5" />
              <line x1="436" y1="272" x2="504" y2="272" className="stroke-[var(--foil)]" strokeWidth="2.5" />
            </g>

            {/* Medicine bottle */}
            <g transform="translate(760 96)">
              <rect x="-34" y="0" width="68" height="30" rx="6" className="fill-[var(--ink)]" />
              <rect x="-46" y="28" width="92" height="150" rx="16" className="fill-[var(--paper-card)] stroke-[var(--foil)]" strokeWidth="2" />
              <rect x="-30" y="92" width="60" height="8" rx="4" className="fill-[var(--mint)]" />
              <rect x="-30" y="108" width="44" height="8" rx="4" className="fill-[var(--foil)]" />
            </g>
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
