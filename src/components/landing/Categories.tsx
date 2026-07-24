'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
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
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

/**
 * Categories — a curated STATIC list of pharma categories.
 * Do NOT read from DB (food-store leftovers).
 */
const CATEGORIES = [
  { name: 'Pain Relief', icon: Pill },
  { name: 'Antibiotics', icon: Shield },
  { name: 'Diabetes Care', icon: Droplets },
  { name: 'Heart & BP', icon: Heart },
  { name: 'Skin Care', icon: Sparkles },
  { name: 'Vitamins & Minerals', icon: Leaf },
  { name: 'Baby Care', icon: Baby },
  { name: 'Ayurveda', icon: Flower2 },
];

export function Categories() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[var(--paper)]">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          align="center"
          eyebrow="Catalogue"
          title="Browse by category"
          description="Find medicines for common health needs"
          className="mb-10"
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORIES.map((category, i) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : (i % 4) * 0.06,
                }}
                viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              >
                <Link
                  href="/products"
                  className="flex h-full flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 text-center shadow-[var(--shadow-xs)] transition-[box-shadow,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--mint)] hover:shadow-[var(--shadow-md)]"
                >
                  <div className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--mint-soft)] p-3 text-[var(--mint)]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-[0.9375rem] font-semibold text-[var(--ink)]">
                    {category.name}
                  </h3>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
