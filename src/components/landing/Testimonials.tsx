'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TESTIMONIAL_IMAGES } from '@/lib/landing-images';

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
      'Uploading my prescription was quick. They prepared my order and delivered it within 24 hours.',
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
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[var(--paper)]">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          align="center"
          eyebrow="Customers"
          title="Trusted by customers"
          description="Feedback from people who use Pratigya Medical Store"
          className="mb-10"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_TESTIMONIALS.slice(0, 3).map((testimonial, i) => (
            <motion.figure
              key={testimonial.name}
              className="relative flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                delay: reduceMotion ? 0 : (i % 3) * 0.08,
              }}
              viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            >
              {/* Decorative quote mark */}
              <svg
                viewBox="0 0 32 24"
                className="absolute right-5 top-5 h-6 w-8 text-[var(--foil-soft)]"
                aria-hidden="true"
                fill="currentColor"
              >
                <path d="M0 24V14.4C0 6.4 4.8 1.2 12.4 0l1.4 3.6c-4.4 1.2-6.8 4-7 8.4H12V24H0Zm18 0V14.4C18 6.4 22.8 1.2 30.4 0l1.4 3.6c-4.4 1.2-6.8 4-7 8.4H30V24H18Z" />
              </svg>

              <div className="mb-3 flex gap-1" aria-label={`${testimonial.stars} out of 5 stars`}>
                {Array.from({ length: testimonial.stars }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-[var(--brand)] text-[var(--brand)]"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-[var(--ink)]">{testimonial.quote}</blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-[var(--foil-soft)] pt-4">
                {TESTIMONIAL_IMAGES[i] ? (
                  <Image
                    src={TESTIMONIAL_IMAGES[i].url}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand-deep)]"
                    aria-hidden="true"
                  >
                    {testimonial.initials}
                  </span>
                )}
                <span className="text-[0.9375rem] font-semibold text-[var(--ink)]">
                  {testimonial.name}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--ink-40)]">
          Sample testimonials for demonstration — verified customer feedback will replace these.
        </p>
      </Container>
    </section>
  );
}
