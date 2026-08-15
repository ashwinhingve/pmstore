'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Flame, Sparkles, BadgeIndianRupee, TrendingUp } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

/** Four curated collections, each a small pre-fetched slice of the catalogue. */
export interface CuratedBuckets {
  bestsellers: ProductCardData[];
  newArrivals: ProductCardData[];
  valueBuys: ProductCardData[];
  trending: ProductCardData[];
}

const TABS = [
  { id: 'bestsellers', label: 'Bestsellers', Icon: Flame },
  { id: 'newArrivals', label: 'New arrivals', Icon: Sparkles },
  { id: 'valueBuys', label: 'Value buys', Icon: BadgeIndianRupee },
  { id: 'trending', label: 'Trending', Icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]['id'];

const MAX_PER_TAB = 8;

/**
 * CuratedTabs — the homepage "Shop by" section. Pill tabs switch between four
 * pre-fetched collections (Bestsellers / New arrivals / Value buys / Trending),
 * each shown as a ProductCard grid. Replaces the older single-carousel
 * FeaturedProducts. Buckets are fetched server-side in app/page.tsx with
 * fallbacks so a tab is never empty while there's a catalogue.
 */
export function CuratedTabs({ buckets }: { buckets: CuratedBuckets }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<TabId>('bestsellers');
  const products = buckets[active].slice(0, MAX_PER_TAB);
  const viewAllHref = active === 'bestsellers' ? '/bestsellers' : '/products';

  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-16 sm:py-24">
        <SectionHeading align="center" eyebrow="Curated for you" title="Shop by" className="mb-8" />

        {/* Pill tabs — active is the brand-orange fill; the count rides in a chip. */}
        <div
          role="tablist"
          aria-label="Curated collections"
          className="mb-8 flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            const count = buckets[tab.id].length;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.id)}
                className={`inline-flex h-11 items-center gap-2 rounded-[var(--radius-pill)] px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)] sm:px-5 ${
                  isActive
                    ? 'bg-[image:var(--surface-brand)] text-[var(--brand-ink)] shadow-[var(--shadow-brand)]'
                    : 'border border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink-70)] hover:border-[var(--brand)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
                {count > 0 && (
                  <span
                    className={`data inline-flex min-w-5 items-center justify-center rounded-[var(--radius-pill)] px-1.5 text-xs ${
                      isActive
                        ? 'bg-[var(--brand-ink)]/20 text-[var(--brand-ink)]'
                        : 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {products.length > 0 ? (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
            className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
          >
            {products.map((p) => (
              <ProductCard key={p._id || p.id || p.slug} product={p} />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description="As the catalogue grows this collection will fill up. Meanwhile, browse everything."
            action={{ label: 'Browse all medicines', href: '/products' }}
          />
        )}

        {products.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href={viewAllHref}
              className="group inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--foil)] bg-[var(--paper-card)] px-6 font-semibold text-[var(--brand-deep)] shadow-[var(--shadow-xs)] transition-[transform,box-shadow,border-color] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"
            >
              {active === 'bestsellers' ? 'View all bestsellers' : 'Browse all medicines'}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
