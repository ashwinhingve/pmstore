'use client';

import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

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
  const reduceMotion = useReducedMotion();

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 0);
    setCanScrollRight(
      scrollRef.current.scrollLeft <
        scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 16
    );
  }, []);

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      ref?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = 320; // card width + gap
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const scrollButtonClass =
    'flex h-11 w-11 items-center justify-center rounded-full border border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink)] shadow-[var(--shadow-xs)] transition-[box-shadow,opacity] duration-[var(--dur-fast)] hover:shadow-[var(--shadow-sm)] disabled:opacity-40 disabled:shadow-none';

  if (products.length === 0) {
    return (
      <section className="bg-[var(--paper-tint)]">
        <Container className="py-16 sm:py-24">
          <SectionHeading align="center" title="Featured medicines" className="mb-8" />
          <EmptyState
            title="No featured medicines yet"
            description="Check back soon for handpicked medicines and bestsellers"
            action={{ label: 'Browse all medicines', href: '/products' }}
          />
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Bestsellers"
              title="Featured medicines"
              description="Handpicked bestsellers and trusted essentials"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                aria-label="Scroll featured products left"
                disabled={!canScrollLeft}
                className={scrollButtonClass}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => scroll('right')}
                aria-label="Scroll featured products right"
                disabled={!canScrollRight}
                className={scrollButtonClass}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product) => (
              <div
                key={product._id}
                className="w-72 shrink-0 rounded focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ink)]"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-deep)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
            >
              View all medicines
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
