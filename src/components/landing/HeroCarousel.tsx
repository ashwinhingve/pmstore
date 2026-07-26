'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface HeroSlideView {
  _id?: string;
  image: string;
  title?: string;
  subtitle?: string;
}

/**
 * Shown when the shop hasn't configured any hero slides yet (Admin → Site
 * settings). Uses photos that already ship in /public so the hero looks
 * premium out of the box. Alt text describes each image truthfully.
 */
const FALLBACK_SLIDES: HeroSlideView[] = [
  {
    image: '/landing/hero-pharmacy.jpg',
    title: 'Genuine, government-approved medicines',
    subtitle: 'Dispensed by trained pharmacists',
  },
  {
    image: '/landing/pharmacist.jpg',
    title: 'A pharmacist checks every order',
    subtitle: 'Prescriptions verified before dispatch',
  },
  {
    image: '/images/home.jpg',
    title: 'Free home delivery across Bhopal',
    subtitle: 'Open Mon–Sun, 9 AM – 9 PM',
  },
  {
    image: '/medicine/tablet.jpg',
    title: 'Every price shown per tablet',
    subtitle: 'So you can compare brands fairly',
  },
];

const AUTOPLAY_MS = 5000;

/**
 * The landing hero's sliding image panel. Auto-rotates on marketing surfaces
 * only, pauses on hover/focus, and stays still under prefers-reduced-motion
 * (first slide shown, dots still navigable). Renders admin-managed slides when
 * present, otherwise FALLBACK_SLIDES.
 */
export function HeroCarousel({ slides }: { slides?: HeroSlideView[] }) {
  const reduceMotion = useReducedMotion();
  const items = slides && slides.length > 0 ? slides : FALLBACK_SLIDES;
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  // Autoplay — disabled under reduced motion, while paused, or with one slide.
  useEffect(() => {
    if (reduceMotion || paused || count <= 1) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, count]);

  // Keep the index valid if the slide set changes size.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  const active = items[index];

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      role="group"
      aria-roledescription="carousel"
      aria-label="Pratigya Medical Store highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--paper-card)] shadow-[var(--shadow-hero)] ring-1 ring-[var(--foil-soft)]">
        <AnimatePresence mode="sync">
          <motion.div
            key={active._id ?? index}
            className="absolute inset-0"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeInOut' }}
          >
            <Image
              src={active.image}
              alt={active.title || ''}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 90vw, 28rem"
              className="object-cover"
            />
            {(active.title || active.subtitle) && (
              // Scrim sits only under the caption strip — the hero stays light.
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/25 to-transparent p-5 pt-16">
                {active.title && (
                  <p className="text-[length:var(--step-1)] font-semibold leading-tight text-[var(--paper)]">
                    {active.title}
                  </p>
                )}
                {active.subtitle && (
                  <p className="mt-1 text-sm text-[var(--ink-10)]">{active.subtitle}</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--paper-card)]/90 text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--paper-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--paper-card)]/90 text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--paper-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Announce slide changes to assistive tech. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {index + 1} of {count}
        {active.title ? `: ${active.title}` : ''}
      </p>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {items.map((slide, i) => {
            const isActive = i === index;
            return (
              <button
                key={slide._id ?? i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={isActive ? 'true' : undefined}
                className="flex h-11 items-center justify-center px-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
              >
                <span
                  className={`block h-1.5 rounded-[var(--radius-pill)] transition-[width,background-color] duration-[var(--dur-base)] ${
                    isActive ? 'w-6 bg-[var(--mint)]' : 'w-2 bg-[var(--foil)]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
