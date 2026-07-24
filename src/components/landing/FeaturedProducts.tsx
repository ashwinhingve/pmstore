'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  originalPrice?: number;
  images?: Array<{ url: string }>;
  stock: number;
  category?: { name: string } | string;
  averageRating?: number;
  totalReviews?: number;
  packSize?: number;
  packUnit?: string;
  unitPrice?: number;
}

interface FeaturedProductsProps {
  products: Product[];
}

/**
 * FeaturedProducts — horizontal carousel with keyboard navigation.
 * Renders ProductCard for each; EmptyState if empty.
 */
export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check scroll position
  const checkScroll = () => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 0);
    setCanScrollRight(
      scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 16
    );
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      ref?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = 320; // card width + gap
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  if (products.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-[length:var(--step-2)] font-bold text-[var(--ink)] mb-8">
          Featured medicines
        </h2>
        <EmptyState
          title="No featured medicines yet"
          description="Check back soon for handpicked medicines and bestsellers"
          action={{ label: 'Browse all medicines', href: '/products' }}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        viewport={{ once: true, margin: '0px 0px -100px 0px' }}
      >
        <div className="text-center mb-8">
          <h2 className="text-[length:var(--step-2)] font-bold text-[var(--ink)]">
            Featured medicines
          </h2>
          <p className="mt-2 text-[var(--ink-70)]">
            Handpicked bestsellers and trusted essentials
          </p>
        </div>

        <div className="relative">
          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product) => (
              <div
                key={product._id}
                className="shrink-0 w-72 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ink)] rounded"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {/* Navigation buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll featured products left"
              className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-16 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--paper-card)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll featured products right"
              className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-16 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--paper-card)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </motion.div>
    </section>
  );
}
