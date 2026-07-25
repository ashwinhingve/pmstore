"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RxBadge } from "@/components/shared/RxBadge";
import { PriceBlock } from "@/components/shared/PriceBlock";
import { formatINR, type ScheduleClass } from "@/lib/pharma/format";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "@/store/useToastStore";
import { useState, useEffect } from "react";
import { Plus, Minus, Package } from "lucide-react";

export interface ProductCardData {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  unitPrice?: number;
  packSize?: number;
  packUnit?: string;
  scheduleClass?: ScheduleClass;
  images?: Array<string | { url: string }>;
  stock?: number;
  category?: { name: string } | string;
  averageRating?: number;
  average_rating?: number;
  totalReviews?: number;
  review_count?: number;
  isFeatured?: boolean;
  createdAt?: string | Date;
  weight?: number;
  weightUnit?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  showSaleBadge?: boolean;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const productId = (product._id || product.id) as string;
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemQuantity = useCartStore((state) => state.getItemQuantity(productId));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    router.push('/checkout');
  };

  // Handle both old schema (string) and new schema (object with url)
  const getImageUrl = () => {
    if (!product.images || product.images.length === 0) return null;
    const firstImage = product.images[0];
    return typeof firstImage === 'string' ? firstImage : firstImage.url;
  };

  const imageUrl = getImageUrl();
  const averageRating = product.averageRating || product.average_rating || 0;
  const totalReviews = product.totalReviews || product.review_count || 0;
  const outOfStock = typeof product.stock === 'number' && product.stock <= 0;

  // Pack label: pharma pack size first, legacy weight as fallback
  const packLabel = (() => {
    if (product.packSize && product.packUnit) {
      const plural =
        ['tablet', 'capsule'].includes(product.packUnit) && product.packSize !== 1 ? 's' : '';
      return `${product.packSize} ${product.packUnit}${plural}`;
    }
    if (product.weight) {
      const unit = product.weightUnit || 'g';
      if (unit === 'g' && product.weight >= 1000) return `${product.weight / 1000} kg`;
      if (unit === 'ml' && product.weight >= 1000) return `${product.weight / 1000} L`;
      return `${product.weight} ${unit}`;
    }
    return null;
  })();

  // Newly added within the last 30 days
  const isNew = (() => {
    if (!product.createdAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(product.createdAt) > thirtyDaysAgo;
  })();

  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)]">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-[var(--paper-tint)]">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 25vw, 20vw"
              className="object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="p-6 text-center">
                <Package className="mx-auto mb-2 h-12 w-12 text-[var(--ink-40)]" aria-hidden="true" />
                <p className="text-sm font-medium text-[var(--ink-70)]">{product.name}</p>
              </div>
            </div>
          )}

          {/* Rx flag — always visible in listings (docs/03-DESIGN-SYSTEM.md) */}
          {product.scheduleClass && (
            <RxBadge scheduleClass={product.scheduleClass} className="absolute left-2 top-2" />
          )}

          {isNew && (
            <span className="absolute right-2 top-2 rounded-[var(--radius-pill)] bg-[var(--mint)] px-2.5 py-1 text-xs font-semibold text-[var(--paper-card)] shadow-[var(--shadow-xs)]">
              New
            </span>
          )}

          {packLabel && (
            <span className="pack absolute bottom-2 left-2 rounded-[var(--radius-pill)] border border-[var(--foil-soft)] bg-[var(--paper-card)]/90 px-2.5 py-1 text-xs font-semibold text-[var(--ink)] backdrop-blur-sm">
              {packLabel}
            </span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 flex items-end justify-center bg-[var(--paper-card)]/50 pb-3">
              <span className="rounded-[var(--radius-pill)] bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--paper-card)]">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-1 flex-col p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--mint)]">
            {typeof product.category === 'string' ? product.category : product.category?.name}
          </p>

          <h3 className="mb-2 line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug text-[var(--ink)] md:text-base">
            {product.name}
          </h3>

          {averageRating > 0 && (
            <div className="mb-2 flex items-center gap-1">
              <div className="flex" aria-label={`Rated ${averageRating} out of 5`}>
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-3.5 w-3.5 fill-current ${
                      i < Math.floor(averageRating) ? "text-[var(--mint)]" : "text-[var(--foil-soft)]"
                    }`}
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="data text-xs text-[var(--ink-40)]">({totalReviews})</span>
            </div>
          )}

          {/* Price — unit price line always present when we have the data */}
          <div className="mt-auto pt-2">
            {product.unitPrice && product.packSize && product.packUnit ? (
              <PriceBlock
                price={product.price}
                mrp={product.originalPrice}
                unitPrice={product.unitPrice}
                packSize={product.packSize}
                packUnit={product.packUnit}
                className="mb-3"
              />
            ) : (
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="price text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
                  {formatINR(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="price text-sm text-[var(--ink-40)] line-through">
                    MRP {formatINR(product.originalPrice)}
                  </span>
                )}
              </div>
            )}

            {mounted && itemQuantity > 0 ? (
              <div className="flex items-center gap-1">
                <button
                  aria-label="Decrease quantity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (itemQuantity <= 1) {
                      removeItem(productId);
                    } else {
                      updateQuantity(productId, itemQuantity - 1);
                    }
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--foil-soft)] text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil)]"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="data flex-1 text-center text-sm font-bold text-[var(--ink)]">
                  {itemQuantity} in cart
                </span>
                <button
                  aria-label="Increase quantity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addItem(product, 1);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint-soft)] text-[var(--mint)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--mint)] hover:text-[var(--paper-card)]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  disabled={isAdding || outOfStock}
                  className="h-10 w-full bg-[var(--mint)] text-sm font-semibold text-[var(--paper-card)] hover:bg-[var(--mint-deep)]"
                >
                  {isAdding ? "Added to cart" : "Add to cart"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBuyNow}
                  disabled={outOfStock}
                  className="h-10 w-full text-sm font-semibold"
                >
                  Buy now
                </Button>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
