'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_IMAGES } from '@/lib/landing-images';
import { Container } from '@/components/shared/Container';

/** An admin-configured hero slide (SiteSettings.heroSlider). */
export interface HeroSlideView {
  _id?: string;
  image: string;
  title?: string;
}

/**
 * HeroSlider — the landing page's image-only banner slider.
 *
 * Purely visual: the images cross-fade with a slow Ken Burns zoom, with no
 * headline, search or CTAs over them. The store's search lives in the header on
 * every breakpoint, so it is always reachable without a hero copy block.
 *
 * The slider is a fixed 16:7 aspect box (the same ratio admins see when they
 * upload), so the *same* image keeps its framing across breakpoints — on a phone
 * a wide banner simply renders shorter rather than being zoomed and cropped.
 *
 * Consumes the same admin-managed `slides` (SiteSettings.heroSlider) as before;
 * when none are configured it falls back to the curated HERO_IMAGES set. Auto-
 * rotates, pauses on hover/focus, and stays still under prefers-reduced-motion.
 */

const AUTOPLAY_MS = 6000;

interface HeroFrame {
  image: string;
  alt: string;
}

export function HeroSlider({ slides }: { slides?: HeroSlideView[] }) {
  const reduceMotion = useReducedMotion();

  const frames: HeroFrame[] =
    slides && slides.length > 0
      ? slides.map((s) => ({ image: s.image, alt: s.title || '' }))
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
    <section className="bg-[var(--paper)] py-4 sm:py-6">
      <Container>
        <div
          className="relative isolate aspect-[16/7] max-h-[80vh] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--foil-soft)] shadow-[var(--shadow-feature)]"
          role="group"
          aria-roledescription="carousel"
          aria-label="Store highlights"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
      {/* Image layer — clean, no legibility scrims (there is no copy over it) */}
      <div className="absolute inset-0">
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
      </div>

      {/* Slide announcement for assistive tech */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {index + 1} of {count}
        {active.alt ? `: ${active.alt}` : ''}
      </p>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/90 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/90 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Dots sit in a translucent pill so they stay visible on any image */}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--ink)]/35 px-2.5 py-1 backdrop-blur-sm">
            {frames.map((frame, i) => {
              const isActive = i === index;
              return (
                <button
                  key={frame.image + i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  className="flex h-8 items-center justify-center px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
                >
                  <span
                    className={`block h-1.5 rounded-[var(--radius-pill)] transition-[width,background-color] duration-[var(--dur-base)] ${
                      isActive ? 'w-8 bg-[var(--brand-ink)]' : 'w-2.5 bg-[var(--brand-ink)]/60'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
        </div>
      </Container>
    </section>
  );
}
