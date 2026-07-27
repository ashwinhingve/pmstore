'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { PHARMA_CATEGORIES } from '@/lib/categories';
import { getCategoryTint } from '@/lib/pharma/medicine-visual';
import { CATEGORY_IMAGES } from '@/lib/landing-images';
import { cn } from '@/lib/utils';

/**
 * Categories — image-backed cards, one per canonical pharma category
 * (src/lib/categories.ts). Category names match the DB so each card links to a
 * working /products filter. Replaces the old icon-tile grid; this is where
 * category browsing lives now that the top nav no longer carries a dropdown.
 *
 * Each card uses a curated photo (CATEGORY_IMAGES, keyed by slug). A category
 * with no photo falls back to its tinted card, so the grid is never broken.
 */
export function Categories() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[var(--paper)]">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          align="center"
          eyebrow="Catalogue"
          title="Shop by category"
          description="Tap a category to see every brand, priced per tablet"
          className="mb-10"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {PHARMA_CATEGORIES.map((category, i) => {
            const Icon = category.icon;
            const tint = getCategoryTint(category.name);
            const img = CATEGORY_IMAGES[category.slug];
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : (i % 4) * 0.05,
                }}
                viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              >
                <Link
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  {img ? (
                    <>
                      <Image
                        src={img.url}
                        alt={img.alt}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-105"
                      />
                      {/* Scrim so the label stays legible over any photo. */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0" style={{ backgroundColor: tint.bg }} />
                  )}

                  <div className="relative flex items-center gap-2.5 p-3.5 sm:p-4">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-ink)]/95 shadow-[var(--shadow-xs)]"
                      style={{ color: img ? 'var(--brand-deep)' : tint.fg }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h3
                      className={cn(
                        'text-[0.9375rem] font-semibold leading-tight',
                        img ? 'text-[var(--brand-ink)]' : 'text-[var(--ink)]',
                      )}
                    >
                      {category.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border-2 border-[var(--brand)] px-6 py-2.5 font-semibold text-[var(--brand-deep)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            View all medicines
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
