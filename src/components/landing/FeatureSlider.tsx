'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
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
 * Shows TWO images at once on tablet/desktop (one on small phones) and advances
 * one image at a time, the track sliding horizontally so a fresh image enters on
 * the right while one leaves on the left. Admin-managed
 * (SiteSettings.featureSlider): images are added / removed / reordered / replaced
 * from Admin → Site settings, so any number of slides can be shown. Pauses on
 * hover/focus, respects prefers-reduced-motion, and falls back to a curated set
 * so it never renders blank (the Capacitor app is a WebView of this exact site).
 *
 * The track is pure CSS width (basis-full / sm:basis-1/2); only `perView` (from
 * matchMedia) drives the translate step, so the first paint — index 0, zero
 * offset — is always correct and there is no measuring flash.
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

  // Two-up from 640px, one-up on phones. Default 1 for SSR so the first paint
  // (index 0 → no offset) matches whatever width the CSS resolves to.
  const [perView, setPerView] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setPerView(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const maxIndex = Math.max(0, count - perView);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Keep the index in range if perView or the slide count changes under us.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - perView)));
  }, [perView, count]);

  const go = useCallback(
    (next: number) => {
      const m = Math.max(0, count - perView);
      setIndex(next < 0 ? m : next > m ? 0 : next);
    },
    [count, perView],
  );

  useEffect(() => {
    if (reduceMotion || paused || maxIndex < 1) return;
    const id = setInterval(() => setIndex((p) => (p >= maxIndex ? 0 : p + 1)), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, maxIndex]);

  if (count === 0) return null;

  const offsetPct = index * (100 / perView);
  const hasControls = maxIndex >= 1;

  return (
    <section className="bg-[var(--paper)] pb-6 pt-2 sm:pb-8" aria-label="Featured">
      <Container>
        <div
          className="relative isolate"
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured images"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="flex"
              style={{
                transform: `translateX(-${offsetPct}%)`,
                transition: reduceMotion
                  ? 'none'
                  : 'transform var(--dur-slow) cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {frames.map((frame, i) => (
                <div
                  key={frame.image + i}
                  className="shrink-0 grow-0 basis-full px-1.5 sm:basis-1/2"
                  aria-hidden={i < index || i >= index + perView ? 'true' : undefined}
                >
                  <FeatureFrameView frame={frame} priority={i < 2} />
                </div>
              ))}
            </div>
          </div>

          {/* Slide announcement for assistive tech */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            Showing featured images {index + 1} to {Math.min(index + perView, count)} of {count}
          </p>

          {hasControls && (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous featured images"
                className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/90 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next featured images"
                className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)]/90 text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)] md:flex"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* Dots — one per scroll position (stepping one image at a time). */}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {Array.from({ length: maxIndex + 1 }, (_, i) => {
                  const isActive = i === index;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Go to featured position ${i + 1}`}
                      aria-current={isActive ? 'true' : undefined}
                      className="flex h-8 items-center justify-center px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    >
                      <span
                        className={`block h-1.5 rounded-[var(--radius-pill)] transition-[width,background-color] duration-[var(--dur-base)] ${
                          isActive ? 'w-8 bg-[var(--brand)]' : 'w-2.5 bg-[var(--brand)]/40'
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

/** A single feature card — its own aspect box, optionally linked and captioned. */
function FeatureFrameView({ frame, priority }: { frame: FeatureFrame; priority: boolean }) {
  const inner = (
    <>
      <Image
        src={frame.image}
        alt={frame.alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 40vw"
        className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
      />
      {frame.alt && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/70 via-[var(--ink)]/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-4 text-base font-semibold text-[var(--paper)] sm:p-5 sm:text-lg">
            {frame.alt}
          </span>
        </>
      )}
    </>
  );

  const className =
    'group relative block aspect-[16/10] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--foil-soft)] shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

  return frame.href ? (
    <Link href={frame.href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
