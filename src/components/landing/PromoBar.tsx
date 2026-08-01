'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingDown, Truck, FlaskConical, MessageCircle } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { CONTACT } from '@/lib/constants';

/**
 * PromoBar — a compact band of headline offers, mirroring the promos the store
 * leads with (save 60–70%, free delivery, pathology discount, WhatsApp ordering).
 * Deliberately a thin inline row so it reads as offers, distinct from the fuller
 * TrustBand card grid further down. Numbers use --font-data per the mono rule.
 */
const PROMOS = [
  { icon: TrendingDown, value: '60–70%', label: 'off with generic brands', href: '/products' },
  { icon: Truck, value: 'Free', label: 'home delivery, no minimum', href: '/products' },
  { icon: FlaskConical, value: '30–40%', label: 'off pathology & lab tests', href: '/contact' },
  { icon: MessageCircle, value: 'WhatsApp', label: 'quick, easy ordering', href: CONTACT.whatsappHref },
] as const;

export function PromoBar() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="border-b border-[var(--foil-soft)] bg-[var(--paper-tint)]" aria-label="Store offers">
      <Container className="py-6">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {PROMOS.map(({ icon: Icon, value, label, href }, i) => (
            <motion.li
              key={label}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : i * 0.06 }}
              viewport={{ once: true }}
            >
              <Link
                href={href}
                className="group relative flex items-center gap-3.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-4 shadow-[var(--shadow-xs)] transition-[box-shadow,border-color,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[3px] bg-[image:var(--surface-brand)] opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100"
                />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[image:var(--surface-brand)] text-[var(--brand-ink)] shadow-[var(--shadow-xs)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="data block truncate text-[length:var(--step-1)] font-bold leading-tight text-[var(--ink)]">
                    {value}
                  </span>
                  <span className="block truncate text-sm text-[var(--ink-70)]">{label}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
