'use client';

import { useReducedMotion } from 'framer-motion';
import { ProductCard, type ProductCardData } from '@/components/products/ProductCard';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

/**
 * One identical "half" of the looping track — rendered twice so the marquee
 * can slide by exactly -50% and loop seamlessly. Extracted to a real
 * component (not an inline closure) so ProductCard's own state isn't reset
 * on every ProductMarquee re-render.
 */
function CardRow({ products, hidden = false }: { products: ProductCardData[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 gap-4 px-2" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {products.map((p) => (
        <div key={p._id || p.id || p.slug} className="w-40 shrink-0 sm:w-48 lg:w-56">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

/**
 * ProductMarquee — the homepage "More to explore" band: a compact,
 * continuously-scrolling row mixing products from several categories,
 * several visible side by side. Pure CSS (`.animate-marquee`, the same
 * keyframe AnnouncementBar uses) — no new dependency. Pauses on
 * hover/keyboard focus. Under prefers-reduced-motion, renders a static
 * horizontal scroll-snap row instead (same accessible fallback pattern as
 * the Strip), and the hidden duplicate half is inert so it's never reachable
 * by keyboard or a screen reader.
 */
export function ProductMarquee({ products }: { products: ProductCardData[] }) {
  const reduceMotion = useReducedMotion();
  if (products.length === 0) return null;

  return (
    <section className="bg-[var(--paper-tint)] py-14 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Across the store"
          title="More to explore"
          description="A mix of bestsellers and everyday essentials, across categories."
          className="mb-8"
        />
      </Container>

      {reduceMotion ? (
        <Container>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {products.map((p) => (
              <div key={p._id || p.id || p.slug} className="w-40 shrink-0 snap-start sm:w-48 lg:w-56">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Container>
      ) : (
        <div className="overflow-hidden" aria-label="More products across categories" role="region">
          <div
            className="flex w-max animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
            style={{ animationDuration: `${Math.max(30, products.length * 3)}s` }}
          >
            <CardRow products={products} />
            <CardRow products={products} hidden />
          </div>
        </div>
      )}
    </section>
  );
}
