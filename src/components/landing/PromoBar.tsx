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
    <section className="border-b border-[var(--foil-soft)] bg-[var(--paper-card)]" aria-label="Store offers">
      <Container className="py-5">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
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
                className="group flex items-center gap-3 rounded-[var(--radius-md)] px-1 py-1 transition-colors duration-[var(--dur-fast)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand-deep)] transition-colors duration-[var(--dur-fast)] group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-ink)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span
                    className="block truncate font-[family-name:var(--font-display)] text-[length:var(--step-1)] font-bold leading-tight text-[var(--ink)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
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
