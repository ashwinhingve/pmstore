'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SearchBar } from '@/components/search/SearchBar';
import { HERO_IMAGES } from '@/lib/landing-images';
import type { HeroSlideView } from './HeroCarousel';

/**
 * HeroSlider — the landing page's full-bleed, near-full-screen image slider.
 *
 * Replaces the older split text+carousel Hero (kept in the repo at
 * ./Hero.tsx / ./HeroCarousel.tsx, just no longer rendered). The background
 * images cross-fade with a slow Ken Burns zoom while a fixed foreground —
 * headline, search and CTAs — stays put, so search (the primary navigation) is
 * always reachable.
 *
 * Consumes the same admin-managed `slides` (SiteSettings.heroSlider) as before;
 * when none are configured it falls back to the curated HERO_IMAGES set. Auto-
 * rotates, pauses on hover/focus, and stays still under prefers-reduced-motion.
 */

const AUTOPLAY_MS = 6000;

interface HeroFrame {
  image: string;
  alt: string;
  caption?: string;
}

export function HeroSlider({ slides }: { slides?: HeroSlideView[] }) {
  const reduceMotion = useReducedMotion();

  const frames: HeroFrame[] =
    slides && slides.length > 0
      ? slides.map((s) => ({ image: s.image, alt: s.title || '', caption: s.title }))
      : HERO_IMAGES.map((h) => ({ image: h.url, alt: h.alt }));

  const count = frames.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (reduceMotion || paused || count <= 1) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  const active = frames[index];

  return (
    <section
      className="relative isolate flex min-h-[560px] w-full items-center overflow-hidden [height:82svh] lg:[height:86svh]"
      role="group"
      aria-roledescription="carousel"
      aria-label="Pratigya Medical Store highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Background image layer + legibility scrims */}
      <div className="absolute inset-0 -z-10">
        <AnimatePresence mode="sync">
          <motion.div
            key={active.image + index}
            className="absolute inset-0"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeInOut' }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ scale: reduceMotion ? 1 : 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 7, ease: 'linear' }}
            >
              <Image
                src={active.image}
                alt={active.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
        {/* Dark scrim for text legibility over any photo… */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/35 to-[var(--ink)]/45" />
        {/* …plus a warm brand wash from the content side. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-deep)]/55 via-[var(--brand-deep)]/10 to-transparent" />
      </div>

      <Container className="relative z-10 py-12 sm:py-16">
        <div className="max-w-xl text-[var(--brand-ink)]">
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            Pratigya Medical Store
          </span>

          <h1 className="mt-4 text-[length:var(--step-4)] text-[var(--brand-ink)]">
            Genuine medicines, delivered across Bhopal
          </h1>

          <p className="mt-4 text-[length:var(--step-1)] text-[var(--brand-ink)]/90">
            Every price shown per tablet, so you compare brands fairly.
            Pharmacist-checked and government-approved.
          </p>

          {/* Search stays in the hero on tablet/desktop — it is the primary
              navigation. On mobile it is hidden because the sticky header already
              shows a full-width search bar right above the hero. */}
          <div className="mt-6 hidden max-w-lg sm:block">
            <SearchBar />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand-ink)] px-6 font-semibold text-[var(--brand-deep)] shadow-[var(--shadow-md)] transition-[background-color,box-shadow] duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
            >
              Shop medicines
            </Link>
            <Link
              href="/prescriptions"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] border-2 border-[var(--brand-ink)]/70 px-6 font-semibold text-[var(--brand-ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
            >
              Upload prescription
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-[var(--brand-ink)]/90">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Government-approved
            </li>
            <li className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Pharmacist-checked
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Free home delivery
            </li>
          </ul>
        </div>
      </Container>

      {/* Slide announcement for assistive tech */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {index + 1} of {count}
        {active.caption ? `: ${active.caption}` : ''}
      </p>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/85 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/85 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {frames.map((frame, i) => {
              const isActive = i === index;
              return (
                <button
                  key={frame.image + i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  className="flex h-11 items-center justify-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
                >
                  <span
                    className={`block h-1.5 rounded-[var(--radius-pill)] transition-[width,background-color] duration-[var(--dur-base)] ${
                      isActive ? 'w-8 bg-[var(--brand-ink)]' : 'w-2.5 bg-[var(--brand-ink)]/50'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
