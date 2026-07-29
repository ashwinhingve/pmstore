'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Stethoscope, Truck } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

/**
 * WhyChooseUs — three photography-led reasons to trust the store. Replaces the
 * old sample-testimonials block: no invented customers or fabricated ratings
 * (a real liability on a pharmacy), just the promises the site stands behind.
 *
 * Uses lifestyle photos that are NOT reused elsewhere on the page (TrustBand
 * already carries the pharmacist counter shot), so the landing never repeats an
 * image within a screen of itself.
 */
const REASONS = [
  {
    icon: ShieldCheck,
    image: '/landing/trust-2.jpg',
    imageAlt: 'Precise quality check in a lab',
    title: 'Genuine, approved medicines',
    body: 'Sourced from licensed distributors and checked before dispatch. Schedule-H medicines are verified against your prescription.',
  },
  {
    icon: Stethoscope,
    image: '/landing/hero-5.jpg',
    imageAlt: 'Colourful capsules from a bottle',
    title: 'Fair price, per tablet',
    body: 'Every brand is shown priced per tablet, so you compare like for like — and a trained pharmacist reviews each order.',
  },
  {
    icon: Truck,
    image: '/landing/trust-3.jpg',
    imageAlt: 'Couple walking outdoors',
    title: 'Delivered across Bhopal',
    body: 'Free home delivery, with refill reminders before your regular medicines run out.',
  },
] as const;

export function WhyChooseUs() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[var(--paper)]">
      <Container className="py-16 sm:py-24">
        <SectionHeading
          align="center"
          eyebrow="Why us"
          title="Why choose Pratigya Medical Store"
          description="Genuine medicines, honest pricing, and a pharmacist on every order"
          className="mb-10"
        />

        <div className="grid gap-5 sm:grid-cols-3">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <motion.article
                key={reason.title}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] sm:aspect-[4/5]"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : i * 0.08,
                }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
              >
                <Image
                  src={reason.image}
                  alt={reason.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-105"
                />
                {/* Ink scrim so the copy stays legible over any photo. */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/90 via-[var(--ink)]/45 to-transparent" />

                <div className="relative p-6 text-[var(--brand-ink)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-ink)]/95 text-[var(--brand-deep)] shadow-[var(--shadow-xs)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[length:var(--step-2)] text-[var(--brand-ink)]">
                    {reason.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--brand-ink)]/90">
                    {reason.body}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
