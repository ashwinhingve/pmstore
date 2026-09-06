'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ProductVisual } from '@/components/products/ProductVisual';
import type { ProductCardData } from '@/components/products/ProductCard';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

const AVATAR_CLASS =
  'block h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full shadow-[var(--shadow-sm)] ring-1 ring-[var(--foil-soft)] transition-transform duration-[var(--dur-fast)] hover:-translate-y-0.5 sm:h-24 sm:w-24 lg:h-28 lg:w-28';

const CARD_CLASS =
  'block aspect-square shrink-0 overflow-hidden rounded-lg shadow-[var(--shadow-sm)] ring-1 ring-[var(--foil-soft)] transition-all duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)] active:scale-95';

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

function Card({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex flex-col gap-3 flex-shrink-0 w-28 sm:w-32 lg:w-40 group"
      aria-label={product.name}
    >
      <div className={CARD_CLASS}>
        <ProductVisual
          imageUrl={rawImageUrl(product.images)}
          form={product.form}
          category={categoryName(product.category)}
          name={product.name}
          sizes="(max-width: 640px) 112px, (max-width: 1024px) 128px, 160px"
        />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-[var(--ink)] truncate text-sm group-hover:text-[var(--brand)] transition-colors">
          {product.name}
        </p>
        {product.manufacturer && (
          <p className="text-xs text-[var(--ink-40)] truncate">{product.manufacturer}</p>
        )}
        <p className="price text-xs text-[var(--ink-70)] mt-1">
          ₹{product.unitPrice?.toFixed(2) || '0.00'}/unit
        </p>
      </div>
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
 * Card row — identical "half" for card variant, rendered twice for seamless looping.
 */
function CardRow({ products, hidden = false }: { products: ProductCardData[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 gap-3 px-2 sm:gap-4" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {products.map((p) => (
        <Card key={p._id || p.id || p.slug} product={p} />
      ))}
    </div>
  );
}

/**
 * ProductImageSlider — a quiet, image-only band directly below the hero.
 * Default (avatar) variant: circular product photos only, no name/price — pure visual texture.
 * Card variant: rounded rectangles with product name and unit price below.
 *
 * Reuses the `.animate-marquee` keyframe (src/styles/globals.css) already powering
 * ProductMarquee/AnnouncementBar for a continuous, subtle auto-scroll; pauses on
 * hover/focus and falls back to a static snap-scroll row under prefers-reduced-motion.
 *
 * `title` is optional — the default (avatar) use below the hero stays heading-free
 * "texture"; passing a title labels a second use (e.g. the OTC band) without
 * duplicating the marquee markup.
 *
 * `variant` defaults to 'avatar' (circular, existing style), or 'card' (rectangle tiles
 * with text, used for the OTC/curated lower slider).
 */
export function ProductImageSlider({
  products,
  title,
  ariaLabel = 'Featured medicines',
  variant = 'avatar',
}: {
  products: ProductCardData[];
  title?: string;
  ariaLabel?: string;
  variant?: 'avatar' | 'card';
}) {
  const reduceMotion = useReducedMotion();
  if (products.length === 0) return null;

  const heading = title && (
    <Container>
      <SectionHeading title={title} className="mb-6" />
    </Container>
  );

  const isCard = variant === 'card';
  const Row = isCard ? CardRow : AvatarRow;

  if (reduceMotion) {
    return (
      <section className="bg-[var(--paper)] py-6 sm:py-8" aria-label={ariaLabel}>
        {heading}
        <div className={`flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:gap-5 sm:px-6 lg:px-8 ${isCard ? 'sm:gap-4' : ''}`}>
          {products.map((p) => (
            <div key={p._id || p.id || p.slug} className="snap-start">
              {isCard ? <Card product={p} /> : <Avatar product={p} />}
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
        style={{ animationDuration: `${Math.max(20, products.length * (isCard ? 3 : 2.5))}s` }}
      >
        <Row products={products} />
        <Row products={products} hidden />
      </div>
    </section>
  );
}
