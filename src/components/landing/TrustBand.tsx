'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, BadgeCheck, Stethoscope, Truck, Check } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { CountUpStat } from '@/components/shared/CountUpStat';
import { VALUE_PROPS } from '@/lib/constants';

/**
 * TrustBand — stats + VALUE_PROPS + credentials.
 */
export function TrustBand() {
  const reduceMotion = useReducedMotion();

  const stats = [
    { label: 'Years trusted', value: 20, suffix: '+' },
    { label: 'Medicines', value: 5000, suffix: '+' },
    { label: 'Happy customers', value: 10000, suffix: '+' },
  ];

  const credentials = [
    { icon: BadgeCheck, label: 'Government approved', note: 'Generic-brand medicines' },
    { icon: ShieldCheck, label: 'Licensed pharmacy', note: 'Valid drug licence' },
    { icon: Stethoscope, label: 'Trained pharmacists', note: '20+ years of service' },
    { icon: Truck, label: 'Free home delivery', note: 'Across Bhopal' },
  ];

  return (
    <section className="bg-[var(--paper-tint-mint)]">
      <Container className="py-14 sm:py-20">
        {/* Stats */}
        <div className="mb-14 grid gap-8 sm:grid-cols-3">
          {stats.map((stat) => (
            <CountUpStat key={stat.label} end={stat.value} suffix={stat.suffix} label={stat.label} />
          ))}
        </div>

        {/* Why us */}
        <div className="mb-14">
          <SectionHeading title="Why Pratigya Medical Store" className="mb-6" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_PROPS.map((prop, i) => (
              <motion.li
                key={prop}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : (i % 3) * 0.06,
                }}
                viewport={{ once: true, margin: '0px 0px -60px 0px' }}
                className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-xs)]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--mint-soft)]">
                  <Check className="h-3.5 w-3.5 text-[var(--mint)]" aria-hidden="true" />
                </span>
                <span className="text-[0.9375rem] font-medium text-[var(--ink)]">{prop}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Credentials */}
        <div>
          <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[var(--ink-70)]">
            Trusted and certified
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {credentials.map((cred, i) => (
              <motion.div
                key={cred.label}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : i * 0.06,
                }}
                viewport={{ once: true }}
                className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-xs)]"
              >
                <cred.icon className="h-6 w-6 shrink-0 text-[var(--mint)]" aria-hidden="true" />
                <div>
                  <p className="text-[0.9375rem] font-semibold text-[var(--ink)]">{cred.label}</p>
                  <p className="text-[0.8125rem] text-[var(--ink-70)]">{cred.note}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
