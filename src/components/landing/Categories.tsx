'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Pill,
  Shield,
  Droplets,
  Heart,
  Leaf,
  Sparkles,
  Baby,
  Flower2,
} from 'lucide-react';

/**
 * Categories — a curated STATIC list of pharma categories.
 * Do NOT read from DB (food-store leftovers).
 */
const CATEGORIES = [
  { name: 'Pain Relief', icon: Pill, emoji: '💊' },
  { name: 'Antibiotics', icon: Shield, emoji: '⚕️' },
  { name: 'Diabetes Care', icon: Droplets, emoji: '🩺' },
  { name: 'Heart & BP', icon: Heart, emoji: '❤️' },
  { name: 'Skin Care', icon: Sparkles, emoji: '✨' },
  { name: 'Vitamins & Minerals', icon: Leaf, emoji: '🌿' },
  { name: 'Baby Care', icon: Baby, emoji: '👶' },
  { name: 'Ayurveda', icon: Flower2, emoji: '🌸' },
];

export function Categories() {
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24 bg-[var(--foil-soft)]/30">
      <div className="text-center mb-12">
        <h2 className="text-[length:var(--step-2)] font-bold text-[var(--ink)]">
          Browse by category
        </h2>
        <p className="mt-2 text-[var(--ink-70)]">
          Find medicines for common health needs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((category, i) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                delay: shouldReduceMotion ? 0 : (i % 4) * 0.1,
              }}
              viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            >
              <Link
                href={`/products`}
                className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 text-center transition-all hover:border-[var(--mint)] hover:shadow-md"
              >
                <div className="inline-flex items-center justify-center rounded-full bg-[var(--mint-soft)] p-3 text-[var(--mint)]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-[var(--ink)] text-[0.9375rem]">
                  {category.name}
                </h3>
                <span className="text-[0.75rem] text-[var(--ink-40)]">
                  Browse
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
