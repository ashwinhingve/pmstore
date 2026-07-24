'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, BadgeCheck, Stethoscope, Truck } from 'lucide-react';
import { VALUE_PROPS } from '@/lib/constants';

/**
 * TrustBand — stats from VALUE_PROPS + genuine credentials.
 */
export function TrustBand() {
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stats = [
    { label: 'Years trusted', value: '20+' },
    { label: 'Medicines', value: '5000+' },
    { label: 'Happy customers', value: '10K+' },
  ];

  const credentials = [
    { icon: BadgeCheck, label: 'Government approved', note: 'Generic-brand medicines' },
    { icon: ShieldCheck, label: 'Licensed pharmacy', note: 'Valid drug licence' },
    { icon: Stethoscope, label: 'Trained pharmacists', note: '20+ years of service' },
    { icon: Truck, label: 'Free home delivery', note: 'Across Bhopal' },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      {/* Stats grid */}
      <div className="grid gap-8 sm:grid-cols-3 mb-16">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.4,
              delay: shouldReduceMotion ? 0 : i * 0.1,
            }}
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          >
            <div className="text-[length:var(--step-2)] font-bold text-[var(--mint)]">
              {stat.value}
            </div>
            <p className="mt-2 text-[var(--ink-70)]">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Why us section */}
      <div className="mb-16">
        <h3 className="text-[length:var(--step-1)] font-bold text-[var(--ink)] mb-6">
          Why Pratigya Medical Store
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE_PROPS.map((prop, i) => (
            <motion.div
              key={prop}
              className="rounded-[var(--radius-sm)] bg-[var(--mint-soft)] p-4 border border-[var(--mint)]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                delay: shouldReduceMotion ? 0 : (i % 3) * 0.1,
              }}
              viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            >
              <p className="text-[var(--ink)] font-medium text-[0.9375rem]">{prop}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Credentials */}
      <div>
        <h3 className="text-[var(--ink-70)] text-[0.875rem] font-semibold uppercase tracking-wide mb-6 text-center">
          Trusted and certified
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {credentials.map((cred, i) => (
            <motion.div
              key={cred.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : i * 0.08 }}
              viewport={{ once: true }}
              className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4"
            >
              <cred.icon className="h-6 w-6 shrink-0 text-[var(--mint)]" aria-hidden="true" />
              <div>
                <p className="font-semibold text-[var(--ink)] text-[0.9375rem]">{cred.label}</p>
                <p className="text-[var(--ink-70)] text-[0.8125rem]">{cred.note}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
