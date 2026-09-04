'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ProductVisual } from '@/components/products/ProductVisual';
import type { ProductCardData } from '@/components/products/ProductCard';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

const AVATAR_CLASS =
  'block h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full shadow-[var(--shadow-sm)] ring-1 ring-[var(--foil-soft)] transition-transform duration-[var(--dur-fast)] hover:-translate-y-0.5 sm:h-24 sm:w-24 lg:h-28 lg:w-28';

function rawImageUrl(images?: ProductCardData['images']): string | null {
  if (!images || images.length === 0) return null;
  const first = images[0];
  return typeof first === 'string' ? first : first.url;
}

function categoryName(category?: ProductCardData['category']): string | undefined {
  return typeof category === 'string' ? category : category?.name;
}

function Avatar({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={AVATAR_CLASS}
      aria-label={product.name}
    >
      <ProductVisual
        imageUrl={rawImageUrl(product.images)}
        form={product.form}
        category={categoryName(product.category)}
        name={product.name}
        sizes="112px"
      />
    </Link>
  );
}

/**
 * One identical "half" of the looping track, rendered twice so the marquee can
 * slide by exactly -50% and loop seamlessly — same pattern as ProductMarquee.
 */
function AvatarRow({ products, hidden = false }: { products: ProductCardData[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 gap-4 px-2 sm:gap-5" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {products.map((p) => (
        <Avatar key={p._id || p.id || p.slug} product={p} />
      ))}
    </div>
  );
}

/**
 * ProductImageSlider — a quiet, image-only band directly below the hero.
 * Circular product photos only: no name, price or button, so it reads as pure
 * visual texture rather than another product grid. Reuses the `.animate-marquee`
 * keyframe (src/styles/globals.css) already powering ProductMarquee/
 * AnnouncementBar for a continuous, subtle auto-scroll; pauses on hover/focus
 * and falls back to a static snap-scroll row under prefers-reduced-motion.
 *
 * `title` is optional — the default (undated) use below the hero stays
 * heading-free "texture"; passing a title labels a second use of the same
 * strip (e.g. the OTC band) without duplicating the marquee markup.
 */
export function ProductImageSlider({
  products,
  title,
  ariaLabel = 'Featured medicines',
}: {
  products: ProductCardData[];
  title?: string;
  ariaLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  if (products.length === 0) return null;

  const heading = title && (
    <Container>
      <SectionHeading title={title} className="mb-6" />
    </Container>
  );

  if (reduceMotion) {
    return (
      <section className="bg-[var(--paper)] py-6 sm:py-8" aria-label={ariaLabel}>
        {heading}
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:gap-5 sm:px-6 lg:px-8">
          {products.map((p) => (
            <div key={p._id || p.id || p.slug} className="snap-start">
              <Avatar product={p} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden bg-[var(--paper)] py-6 sm:py-8" aria-label={ariaLabel}>
      {heading}
      <div
        className="flex w-max animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
        style={{ animationDuration: `${Math.max(20, products.length * 2.5)}s` }}
      >
        <AvatarRow products={products} />
        <AvatarRow products={products} hidden />
      </div>
    </section>
  );
}
