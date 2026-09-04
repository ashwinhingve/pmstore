"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RxBadge } from "@/components/shared/RxBadge";
import { PriceBlock } from "@/components/shared/PriceBlock";
import { formatINR, formatPack, type ScheduleClass } from "@/lib/pharma/format";
import { ProductVisual } from "@/components/products/ProductVisual";
import { WhatsAppGlyph } from "@/components/shared/WhatsAppGlyph";
import { useCartStore } from "@/store/useCartStore";
import { useGatedAddToCart } from "@/hooks/useGatedAddToCart";
import { useCompareStore } from "@/store/useCompareStore";
import { toast } from "@/store/useToastStore";
import { waHref, SITE_URL } from "@/lib/constants";
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
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemQuantity = useCartStore((state) => state.getItemQuantity(productId));
  const { addToCart, gateModal } = useGatedAddToCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, () => {
      setIsAdding(true);
      toast.success(`${product.name} added to cart`);
      setTimeout(() => setIsAdding(false), 1000);
    });
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
    <>
      {gateModal}
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-[box-shadow,border-color,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)]">
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
          <span className="pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--brand)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--brand-ink)] shadow-[var(--shadow-xs)]">
            New
          </span>
        )}

        {/* Pack size — a glanceable chip, like a real strip's printed pack. */}
        {product.packSize && product.packUnit && !outOfStock && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-[var(--radius-pill)] bg-[var(--paper-card)]/95 px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-[var(--ink-70)] shadow-[var(--shadow-xs)]">
            {formatPack(product.packSize, product.packUnit)}
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
          mounted && isPicked ? "border-[var(--brand)] text-[var(--brand)] !opacity-100" : ""
        }`}
      >
        <Scale className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Info — kept deliberately compact: name, price, one action. */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="mb-1.5 line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug text-[var(--ink)]">
          <Link
            href={`/products/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>

        {/* Price — unit price line always leads when we have the data. */}
        <div className="mt-auto pt-2">
          {product.unitPrice && product.packSize && product.packUnit ? (
            <PriceBlock
              price={product.price}
              mrp={product.originalPrice}
              unitPrice={product.unitPrice}
              packSize={product.packSize}
              packUnit={product.packUnit}
              className="mb-2"
            />
          ) : (
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="price text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
                {formatINR(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="price text-sm text-[var(--ink-40)] line-through">
                    {formatINR(product.originalPrice)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-[var(--mint)]">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% off
                  </span>
                </>
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
                    addToCart(product, 1);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-deep)]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isAdding || outOfStock}
                className="h-11 w-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-deep)]"
              >
                {outOfStock ? "Out of stock" : isAdding ? "Added to cart" : "Add to cart"}
              </Button>
            )}

            {/* Chat with us — a per-product WhatsApp link, prefilled with the
                medicine name. Sits above the card's stretched link (stopPropagation
                so a tap opens the chat, not the product page). */}
            <a
              href={waHref(`Hi, I'd like to ask about ${product.name} — ${SITE_URL}/products/${product.slug}`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Chat with us on WhatsApp about ${product.name}`}
              className="relative mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--whatsapp-soft)] text-sm font-semibold text-[var(--whatsapp-deep)] ring-1 ring-inset ring-[var(--whatsapp)]/30 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--whatsapp)] hover:text-[var(--brand-ink)] hover:ring-[var(--whatsapp)]"
            >
              <WhatsAppGlyph className="h-4 w-4 shrink-0" />
              Chat with us
            </a>
          </div>
        </div>
      </div>
    </article>
    </>
  );
}
