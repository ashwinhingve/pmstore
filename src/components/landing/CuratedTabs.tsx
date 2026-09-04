'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { categoryIcon } from '@/lib/categories';

/** A real medicine category and a small pre-fetched slice of its top products. */
export interface CuratedCategoryBucket {
  id: string;
  name: string;
  products: ProductCardData[];
}

const MAX_PER_TAB = 8;

/**
 * CuratedTabs — the homepage "Shop by category" section. Pill tabs switch
 * between the store's top categories by active product count (server-computed
 * in app/page.tsx), each shown as a ProductCard grid. Replaces the earlier
 * generic e-commerce tabs (Bestsellers/New arrivals/Value buys/Trending) with
 * how customers actually browse a pharmacy — by what the medicine is for.
 */
export function CuratedTabs({ buckets }: { buckets: CuratedCategoryBucket[] }) {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | undefined>(buckets[0]?.id);
  const active = buckets.find((b) => b.id === activeId) ?? buckets[0];

  if (!active) return null;

  const products = active.products.slice(0, MAX_PER_TAB);
  const viewAllHref = `/products?category=${encodeURIComponent(active.name)}`;

  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-16 sm:py-24">
        <SectionHeading
          align="center"
          eyebrow="Browse by category"
          title="Shop by category"
          className="mb-8"
        />

        {/* Pill tabs — active is the brand-orange fill; the count rides in a chip. */}
        <div
          role="tablist"
          aria-label="Medicine categories"
          className="mb-8 flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {buckets.map((bucket) => {
            const isActive = bucket.id === active.id;
            const count = bucket.products.length;
            const Icon = categoryIcon(bucket.name);
            return (
              <button
                key={bucket.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(bucket.id)}
                className={`inline-flex h-11 items-center gap-2 rounded-[var(--radius-pill)] px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:px-5 ${
                  isActive
                    ? 'bg-[image:var(--surface-brand)] text-[var(--brand-ink)] shadow-[var(--shadow-brand)]'
                    : 'border border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink-70)] hover:border-[var(--brand)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {bucket.name}
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
            key={active.id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
            className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          >
            {products.map((p) => (
              <ProductCard key={p._id || p.id || p.slug} product={p} />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description="As the catalogue grows this category will fill up. Meanwhile, browse everything."
            action={{ label: 'Browse all medicines', href: '/products' }}
          />
        )}

        {products.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href={viewAllHref}
              className="group inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--foil)] bg-[var(--paper-card)] px-6 font-semibold text-[var(--brand-deep)] shadow-[var(--shadow-xs)] transition-[transform,box-shadow,border-color] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"
            >
              {`Browse all ${active.name}`}
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
