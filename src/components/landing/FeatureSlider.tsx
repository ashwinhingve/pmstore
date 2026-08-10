'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TRUST_IMAGES } from '@/lib/landing-images';
import { Container } from '@/components/shared/Container';

/** An admin-configured feature slide (SiteSettings.featureSlider). */
export interface FeatureSlideView {
  _id?: string;
  image: string;
  title?: string;
  ctaLink?: string;
}

/**
 * FeatureSlider — the wide banner directly below the hero.
 *
 * Shows ONE image at a time and auto-advances continuously, each new image
 * sliding in from the left. Admin-managed (SiteSettings.featureSlider): images
 * are added / removed / reordered / replaced from Admin → Site settings, so any
 * number of slides can be shown. Pauses on hover/focus, respects
 * prefers-reduced-motion, and falls back to a curated set so it never renders
 * blank (the Capacitor app is a WebView of this exact site).
 */

const AUTOPLAY_MS = 4500;

interface FeatureFrame {
  image: string;
  alt: string;
  href?: string;
}

export function FeatureSlider({ slides }: { slides?: FeatureSlideView[] }) {
  const reduceMotion = useReducedMotion();

  const frames: FeatureFrame[] = useMemo(
    () =>
      slides && slides.length > 0
        ? slides.map((s) => ({ image: s.image, alt: s.title || '', href: s.ctaLink || undefined }))
        : TRUST_IMAGES.map((t) => ({ image: t.url, alt: t.alt, href: '/products' })),
    [slides],
  );

  const count = frames.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => setIndex(count > 0 ? ((next % count) + count) % count : 0),
    [count],
  );

  useEffect(() => {
    if (reduceMotion || paused || count <= 1) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, count]);

  // Clamp in render (pure) rather than correcting via an effect, so the index
  // always points at a real frame even if the configured slides change under us.
  const page = count > 0 ? ((index % count) + count) % count : 0;
  const active = frames[page];

  if (!active) return null;

  return (
    <section className="bg-[var(--paper)] pb-6 pt-2 sm:pb-8" aria-label="Featured">
      <Container>
        <div
          className="relative isolate aspect-[16/7] max-h-[70vh] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--foil-soft)] shadow-[var(--shadow-sm)] sm:aspect-[16/6]"
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured images"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <AnimatePresence>
            <motion.div
              key={active.image + page}
              className="absolute inset-0"
              initial={{ x: reduceMotion ? 0 : '-100%', opacity: reduceMotion ? 1 : 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : '100%', opacity: reduceMotion ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <FeatureFrameView frame={active} priority={page === 0} />
            </motion.div>
          </AnimatePresence>

          {/* Slide announcement for assistive tech */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            Featured image {page + 1} of {count}
            {active.alt ? `: ${active.alt}` : ''}
          </p>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(page - 1)}
                aria-label="Previous featured image"
                className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/90 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(page + 1)}
                aria-label="Next featured image"
                className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/90 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* Dots sit in a translucent pill so they stay visible on any image */}
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--ink)]/35 px-2.5 py-1 backdrop-blur-sm">
                {frames.map((frame, i) => {
                  const isActive = i === page;
                  return (
                    <button
                      key={frame.image + i}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Go to featured image ${i + 1}`}
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

/** A single full-bleed banner image, optionally linked and captioned. */
function FeatureFrameView({ frame, priority }: { frame: FeatureFrame; priority: boolean }) {
  const inner = (
    <>
      <Image
        src={frame.image}
        alt={frame.alt}
        fill
        priority={priority}
        sizes="(max-width: 1280px) 100vw, 80vw"
        className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.02]"
      />
      {frame.alt && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/70 via-[var(--ink)]/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-4 text-base font-semibold text-[var(--paper)] sm:p-6 sm:text-lg">
            {frame.alt}
          </span>
        </>
      )}
    </>
  );

  const className =
    'group absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

  return frame.href ? (
    <Link href={frame.href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
