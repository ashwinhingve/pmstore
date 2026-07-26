"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RxBadge } from "@/components/shared/RxBadge";
import { PriceBlock } from "@/components/shared/PriceBlock";
import { formatINR, type ScheduleClass } from "@/lib/pharma/format";
import { ProductVisual } from "@/components/products/ProductVisual";
import { useCartStore } from "@/store/useCartStore";
import { useCompareStore } from "@/store/useCompareStore";
import { toast } from "@/store/useToastStore";
import { useState, useEffect } from "react";
import { Plus, Minus, Scale, Check } from "lucide-react";

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
  form?: string;
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

  const pickForCompare = useCompareStore((state) => state.pick);
  const clearCompare = useCompareStore((state) => state.clear);
  const isPicked = useCompareStore((state) => state.picks.some((p) => p.id === productId));

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const picks = pickForCompare({ id: productId, name: product.name });
    if (picks.length === 2) {
      clearCompare();
      router.push(`/compare?ids=${picks[0].id},${picks[1].id}`);
    } else if (picks.length === 1) {
      toast.info(`Comparing ${picks[0].name} — pick one more medicine`);
    }
  };

  // Raw first image (may be null/placeholder — ProductVisual decides photo vs tile).
  const rawImageUrl = (() => {
    if (!product.images || product.images.length === 0) return null;
    const first = product.images[0];
    return typeof first === "string" ? first : first.url;
  })();

  const categoryName =
    typeof product.category === "string" ? product.category : product.category?.name;
  const averageRating = product.averageRating || product.average_rating || 0;
  const totalReviews = product.totalReviews || product.review_count || 0;
  const outOfStock = typeof product.stock === "number" && product.stock <= 0;

  // Newly added within the last 30 days
  const isNew = (() => {
    if (!product.createdAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(product.createdAt) > thirtyDaysAgo;
  })();

  const inCart = mounted && itemQuantity > 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-[box-shadow,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--mint)] hover:shadow-[var(--shadow-md)]">
      {/* Visual */}
      <div className={`relative aspect-square overflow-hidden border-b border-[var(--foil-soft)] ${outOfStock ? "opacity-70" : ""}`}>
        <ProductVisual
          imageUrl={rawImageUrl}
          form={product.form}
          category={categoryName}
          name={product.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
        />

        {/* Rx flag — always visible in listings (safety). */}
        {product.scheduleClass && (
          <div className="pointer-events-none absolute left-2.5 top-2.5">
            <RxBadge scheduleClass={product.scheduleClass} />
          </div>
        )}

        {isNew && !outOfStock && (
          <span className="pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--mint)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--paper-card)] shadow-[var(--shadow-xs)]">
            New
          </span>
        )}

        {outOfStock && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3">
            <span className="rounded-[var(--radius-pill)] bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--paper-card)]">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Compare — quiet, revealed on hover (always shown on touch). A direct
          child of the card so it sits above the stretched product link. */}
      <button
        type="button"
        onClick={handleCompare}
        aria-pressed={mounted && isPicked}
        aria-label={mounted && isPicked ? "Picked to compare" : "Compare this medicine"}
        className={`absolute right-2.5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--foil-soft)] bg-[var(--paper-card)]/95 text-[var(--ink-70)] shadow-[var(--shadow-sm)] backdrop-blur-sm transition-[opacity,color] duration-[var(--dur-fast)] hover:text-[var(--ink)] focus-visible:opacity-100 ${
          isNew ? "top-11" : "top-2.5"
        } opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${
          mounted && isPicked ? "border-[var(--mint)] text-[var(--mint)] !opacity-100" : ""
        }`}
      >
        <Scale className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        {categoryName && (
          <span className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--mint-deep)]">
            {categoryName}
          </span>
        )}

        <h3 className="mb-2 line-clamp-2 font-[family-name:var(--font-display)] text-[0.95rem] font-semibold leading-snug text-[var(--ink)]">
          <Link
            href={`/products/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            {product.name}
          </Link>
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

        {/* Price — unit price line always leads when we have the data. */}
        <div className="mt-auto pt-3">
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

          {/* One calm primary action — Add to cart becomes a quantity stepper. */}
          <div className="relative z-10">
            {inCart ? (
              <div className="flex items-center gap-1">
                <button
                  aria-label="Decrease quantity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (itemQuantity <= 1) removeItem(productId);
                    else updateQuantity(productId, itemQuantity - 1);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--foil-soft)] text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil)]"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="data flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--mint-soft)] text-sm font-bold text-[var(--mint-deep)]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {itemQuantity} in cart
                </span>
                <button
                  aria-label="Increase quantity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addItem(product, 1);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint)] text-[var(--paper-card)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--mint-deep)]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isAdding || outOfStock}
                className="h-11 w-full bg-[var(--mint)] text-sm font-semibold text-[var(--paper-card)] hover:bg-[var(--mint-deep)]"
              >
                {outOfStock ? "Out of stock" : isAdding ? "Added to cart" : "Add to cart"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
