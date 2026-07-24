'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

/**
 * Testimonials — SAMPLE curated testimonials. Replace with real client feedback.
 * Do NOT fabricate real named people as if verified.
 */
const SAMPLE_TESTIMONIALS = [
  {
    initials: 'R.K.',
    name: 'Rajesh K.',
    quote:
      'Found my heart medications at 45% less than other pharmacies. The home delivery is quick and the staff is very knowledgeable.',
    stars: 5,
  },
  {
    initials: 'P.M.',
    name: 'Priya M.',
    quote:
      'The price per tablet comparison feature is brilliant. No more confusion about which pack size gives better value.',
    stars: 5,
  },
  {
    initials: 'A.V.',
    name: 'Arun V.',
    quote:
      'Uploading my prescription was super simple. They prepared my order and delivered it within 24 hours.',
    stars: 5,
  },
  {
    initials: 'S.P.',
    name: 'Shalini P.',
    quote:
      'Been a customer for over a year now. Reliable, affordable, and they actually care about getting my prescriptions right.',
    stars: 5,
  },
  {
    initials: 'V.K.',
    name: 'Vikram K.',
    quote:
      'The quality of generic medicines is excellent. Great alternative to branded drugs at a fraction of the cost.',
    stars: 5,
  },
];

export function Testimonials() {
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24 bg-[var(--foil-soft)]/30">
      <div className="text-center mb-12">
        <h2 className="text-[length:var(--step-2)] font-bold text-[var(--ink)]">
          Trusted by customers
        </h2>
        <p className="mt-2 text-[var(--ink-70)]">
          Real feedback from people who use Pratigya Medical Store
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_TESTIMONIALS.map((testimonial, i) => (
          <motion.div
            key={testimonial.name}
            className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-card)]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.4,
              delay: shouldReduceMotion ? 0 : (i % 3) * 0.1,
            }}
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          >
            <div className="flex gap-3 mb-3">
              {Array.from({ length: testimonial.stars }).map((_, j) => (
                <Star
                  key={j}
                  className="h-4 w-4 fill-[var(--mint)] text-[var(--mint)]"
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-[var(--ink)] mb-4">{testimonial.quote}</p>
            <div>
              <p className="font-semibold text-[var(--ink)] text-[0.9375rem]">
                {testimonial.name}
              </p>
              <p className="text-[0.8125rem] text-[var(--ink-40)]">
                Customer since 2024
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center text-[0.875rem] text-[var(--ink-40)] bg-[var(--mint-soft)] rounded-[var(--radius-md)] p-4 border border-[var(--mint)]">
        <strong>Note:</strong> These are sample testimonials for demonstration. Real customer feedback will replace these once we gather verified reviews.
      </div>
    </section>
  );
}
