'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LayoutGrid, PackageSearch } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { PHARMA_CATEGORIES, categoryIcon } from '@/lib/categories';
import { getCategoryTint } from '@/lib/pharma/medicine-visual';
import { CATEGORY_IMAGES } from '@/lib/landing-images';
import { cn } from '@/lib/utils';

/** An admin-managed category (from the Category collection). */
export interface CategoryCardView {
  name: string;
  slug: string;
  /** Admin-uploaded image URL; empty falls back to the curated CATEGORY_IMAGES. */
  image?: string;
}

/**
 * Categories — image-backed cards for the storefront's category navigation.
 *
 * Driven by the admin-managed Category collection (passed as `categories`): the
 * name and image come from the DB so both are editable at /admin/categories and
 * appear here without a code change. The canonical taxonomy
 * (src/lib/categories.ts) still supplies each card's icon, tint and routing, and
 * CATEGORY_IMAGES is the photo fallback when a category has no admin image. When
 * no categories are passed (DB unseeded) it renders the full canonical list, so
 * the grid is never blank.
 *
 * Category names match the DB, so each card links to a working /products filter.
 */

const CANON_BY_SLUG = Object.fromEntries(PHARMA_CATEGORIES.map((c) => [c.slug, c]));

function hrefForSlug(slug: string, name: string): string {
  // Pet Care has no SKUs yet, so route to the request form rather than dead-end
  // on an empty /products filter. Medicine is the browse-all door.
  if (slug === 'pet-care') return '/custom-order';
  if (slug === 'medicine') return '/products';
  // A service, not a purchasable product — its own info page, not /products.
  if (slug === 'pathology-nursing-care') return '/pathology-nursing-care';
  return `/products?category=${encodeURIComponent(name)}`;
}

export function Categories({ categories }: { categories?: CategoryCardView[] }) {
  const reduceMotion = useReducedMotion();

  const items = useMemo(() => {
    const source: CategoryCardView[] =
      categories && categories.length > 0
        ? categories
        : PHARMA_CATEGORIES.map((c) => ({ name: c.name, slug: c.slug }));

    return source.map((cat) => {
      const canon = CANON_BY_SLUG[cat.slug];
      const fallback = CATEGORY_IMAGES[cat.slug];
      const image = cat.image || fallback?.url;
      return {
        name: cat.name,
        slug: cat.slug,
        Icon: canon?.icon ?? categoryIcon(cat.name),
        tint: getCategoryTint(cat.name),
        image,
        imageAlt: cat.image ? cat.name : fallback?.alt || cat.name,
        href: hrefForSlug(cat.slug, cat.name),
      };
    });
  }, [categories]);

  return (
    <section className="bg-[var(--paper)]">
      <Container className="py-16 sm:py-24">
        <SectionHeading
          align="center"
          eyebrow="Browse the pharmacy"
          title="Find your medicine faster"
          description="Pick a category to compare every brand by price per tablet — or search the full catalogue."
          className="mb-10"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {items.map((category, i) => {
            const { Icon, tint, image } = category;
            return (
              <motion.div
                key={category.slug || category.name}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : (i % 4) * 0.05,
                }}
                viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              >
                <Link
                  href={category.href}
                  className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:aspect-[4/3]"
                >
                  {image ? (
                    <>
                      <Image
                        src={image}
                        alt={category.imageAlt}
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

                  <div className="relative flex items-center gap-2 p-3 sm:gap-2.5 sm:p-4">
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-ink)]/95 shadow-[var(--shadow-xs)] sm:h-8 sm:w-8"
                      style={{ color: image ? 'var(--brand-deep)' : tint.fg }}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                    </span>
                    <h3
                      className={cn(
                        'min-w-0 font-[family-name:var(--font-display)] text-sm font-extrabold leading-tight tracking-tight line-clamp-2 sm:text-base',
                        image ? 'text-[var(--brand-ink)]' : 'text-[var(--ink)]',
                      )}
                    >
                      {category.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* Browse-all tile — fills the grid and gives one clear catalogue door. */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.05 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
          >
            <Link
              href="/products"
              className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] bg-[image:var(--surface-brand)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:aspect-[4/3]"
            >
              <LayoutGrid
                className="absolute -bottom-5 -right-4 h-28 w-28 text-[var(--brand-ink)]/20"
                strokeWidth={1.25}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between gap-2 p-3 text-[var(--brand-ink)] sm:p-4">
                <h3 className="min-w-0 font-[family-name:var(--font-display)] text-sm font-extrabold leading-tight tracking-tight line-clamp-2 sm:text-base">All medicines</h3>
                <ArrowRight
                  className="h-5 w-5 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </motion.div>

          {/* Request medicine — one door for anything we may not stock. Send a
              photo of the pack/list or type the name and we source it. Brand
              orange so it reads as the primary CTA beside "All medicines". */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.1 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
          >
            <Link
              href="/custom-order"
              className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] bg-[image:var(--surface-brand)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:aspect-[4/3]"
            >
              <PackageSearch
                className="absolute -bottom-5 -right-4 h-28 w-28 text-[var(--brand-ink)]/20"
                strokeWidth={1.25}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between gap-2 p-3 text-[var(--brand-ink)] sm:p-4">
                <h3 className="min-w-0 font-[family-name:var(--font-display)] text-sm font-extrabold leading-tight tracking-tight line-clamp-2 sm:text-base">Request medicine</h3>
                <ArrowRight
                  className="h-5 w-5 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
