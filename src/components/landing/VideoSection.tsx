'use client';

import { useRef, useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Play } from 'lucide-react';

/**
 * VideoSection — a grand short-video band using a self-hosted, royalty-free
 * pharmacy clip (Mixkit Free License — commercial use, no attribution).
 * Lazy-loads and auto-plays when in view, respects prefers-reduced-motion.
 */
export function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.5 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect prefers-reduced-motion on mount
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Auto-play when in view, pause when out of view
  useEffect(() => {
    if (!videoRef.current) return;

    if (inView && !prefersReducedMotion) {
      videoRef.current.play().catch(() => {
        // Autoplay may fail in some browsers; that's ok
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [inView, prefersReducedMotion]);

  return (
    <section ref={ref} className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="text-center mb-8">
        <h2 className="text-[length:var(--step-2)] font-bold text-[var(--ink)]">
          See what we offer
        </h2>
        <p className="mt-2 text-[var(--ink-70)]">
          Trusted pharmacy service, delivered to your door
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--ink)]">
        <video
          ref={videoRef}
          className="w-full h-auto block"
          muted
          playsInline
          loop
          preload="none"
          aria-label="Close-up of medicines"
        >
          <source src="/videos/pharmacy-loop.mp4" type="video/mp4" />
          <p>Your browser does not support the video tag.</p>
        </video>

        {/* Play indicator overlay when not playing */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="inline-flex items-center justify-center rounded-full bg-[var(--mint)] p-4">
              <Play className="h-6 w-6 fill-current text-[var(--paper-card)]" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Accessible caption */}
        <div className="sr-only">
          A close-up video of assorted medicines, illustrating our range of genuine pharmacy stock.
        </div>
      </div>
    </section>
  );
}
