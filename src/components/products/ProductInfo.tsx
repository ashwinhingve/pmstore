'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Package, Check, Share2, Shield, Truck, BadgeCheck, Link2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { toast } from '@/store/useToastStore';
import { formatINR, type ScheduleClass } from '@/lib/pharma/format';
import VariantSelector from './VariantSelector';
import ProductReviews from './ProductReviews';

interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  stock: number;
  category: string | { _id: string; name: string; slug: string };
  images: (string | { url: string })[];
  averageRating: number;
  totalReviews: number;
  weight?: number;
  weightUnit?: string;
  hasVariants: boolean;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    originalPrice?: number;
    stock: number;
    isActive: boolean;
  }>;
  // Pharma context forwarded into the cart snapshot.
  prescriptionRequired?: boolean;
  scheduleClass?: ScheduleClass;
  packSize?: number;
  packUnit?: string;
  unitPrice?: number;
  mrp?: number;
  gstRate?: number;
}

interface ProductInfoProps {
  product: Product;
  autoOpenReview?: boolean;
}

export default function ProductInfo({ product, autoOpenReview }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  // Cart snapshot keeps category as a display string, whatever shape came in
  const categoryName =
    typeof product.category === 'string' ? product.category : product.category?.name ?? '';

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentOriginalPrice = selectedVariant ? selectedVariant.originalPrice : product.originalPrice;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  const discount = currentOriginalPrice && currentOriginalPrice > currentPrice
    ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
    : product.discountPercentage || 0;

  const stockStatus = currentStock === 0
    ? { label: 'Out of stock', color: 'text-[var(--ink-70)]', available: false }
    : currentStock <= 10
    ? { label: `Only ${currentStock} left`, color: 'text-[var(--ink)]', available: true }
    : { label: 'In stock', color: 'text-[var(--mint)]', available: true };

  const handleAddToCart = () => {
    setIsAdding(true);

    addItem({
      _id: product._id,
      variantId: selectedVariant?.id,
      name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
      slug: product.slug,
      price: currentPrice,
      originalPrice: currentOriginalPrice,
      images: product.images,
      category: categoryName,
      prescriptionRequired: product.prescriptionRequired,
      scheduleClass: product.scheduleClass,
      packSize: product.packSize,
      packUnit: product.packUnit,
      unitPrice: product.unitPrice,
      mrp: product.mrp,
      gstRate: product.gstRate,
    }, quantity);

    setTimeout(() => {
      setIsAdding(false);
      setQuantity(1);
    }, 1000);
  };

  const handleBuyNow = () => {
    addItem({
      _id: product._id,
      variantId: selectedVariant?.id,
      name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
      slug: product.slug,
      price: currentPrice,
      originalPrice: currentOriginalPrice,
      images: product.images,
      category: categoryName,
      prescriptionRequired: product.prescriptionRequired,
      scheduleClass: product.scheduleClass,
      packSize: product.packSize,
      packUnit: product.packUnit,
      unitPrice: product.unitPrice,
      mrp: product.mrp,
      gstRate: product.gstRate,
    }, quantity);
    router.push('/checkout');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    }
  };

  const handleCopyReviewLink = () => {
    const reviewUrl = `${window.location.origin}/products/${product.slug}?review=1`;
    navigator.clipboard.writeText(reviewUrl);
    setReviewLinkCopied(true);
    setTimeout(() => setReviewLinkCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Product Name */}
      <div>
        {categoryName && (
          <span className="mb-2 inline-flex w-fit items-center rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--mint-deep)]">
            {categoryName}
          </span>
        )}
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-extrabold leading-tight tracking-tight text-[var(--ink)]">
          {product.name}
        </h1>
        <p className="data text-sm text-[var(--ink-40)]">SKU: {product.sku}</p>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < Math.floor(product.averageRating)
                  ? 'fill-[var(--mint)] text-[var(--mint)]'
                  : 'text-[var(--foil-soft)]'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-[var(--ink-70)]">
          {product.averageRating.toFixed(1)} ({product.totalReviews} reviews)
        </span>
      </div>

      {/* Price — pack price with the per-unit line (the pharma headline) below */}
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="price text-[length:var(--step-2)] font-bold text-[var(--ink)]">
            {formatINR(currentPrice)}
          </span>
          {currentOriginalPrice && currentOriginalPrice > currentPrice && (
            <>
              <span className="price text-lg text-[var(--ink-40)] line-through">
                {formatINR(currentOriginalPrice)}
              </span>
              <span className="rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-3 py-1 text-sm font-semibold text-[var(--mint-deep)]">
                {discount}% off
              </span>
            </>
          )}
        </div>
        {product.unitPrice != null && product.packSize && product.packUnit && (
          <p className="price mt-1.5 text-sm text-[var(--ink-70)]">
            {formatINR(product.unitPrice)} per {product.packUnit} · {product.packSize} {product.packUnit}
          </p>
        )}
      </div>

      {/* Stock Status & Weight */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className={`w-5 h-5 ${stockStatus.color}`} />
          <span className={`text-sm font-medium ${stockStatus.color}`}>
            {stockStatus.label}
          </span>
        </div>
        {product.weight && product.weight > 0 && (
          <div className="flex items-center gap-1.5 bg-[var(--foil-soft)] border border-[var(--foil)] px-3 py-1 rounded-full">
            <span className="text-sm font-semibold text-[var(--ink)]">
              {product.weightUnit === 'g' && product.weight >= 1000
                ? `${product.weight / 1000} kg`
                : product.weightUnit === 'ml' && product.weight >= 1000
                ? `${product.weight / 1000} L`
                : `${product.weight} ${product.weightUnit || 'g'}`}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="border-t border-b border-[var(--foil-soft)] py-4">
        <p className="text-[var(--ink)] leading-relaxed">{product.description}</p>
      </div>

      {/* Variants */}
      {product.hasVariants && product.variants && product.variants.length > 0 && (
        <VariantSelector
          variants={product.variants}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
        />
      )}

      {/* Quantity Selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--foil-soft)] text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] disabled:opacity-40"
            disabled={!stockStatus.available}
          >
            −
          </button>
          <span className="data w-16 text-center text-lg font-semibold text-[var(--ink)]">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
            aria-label="Increase quantity"
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--foil-soft)] text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] disabled:opacity-40"
            disabled={!stockStatus.available || quantity >= currentStock}
          >
            +
          </button>
        </div>
      </div>

      {/* Add to cart + Buy now */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Button
            onClick={handleAddToCart}
            disabled={!stockStatus.available || isAdding}
            className="h-12 flex-1 bg-[var(--ink)] text-base font-semibold hover:bg-[var(--ink-deep)]"
          >
            {isAdding ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Added to cart
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to cart
              </>
            )}
          </Button>

          <Button
            onClick={handleBuyNow}
            disabled={!stockStatus.available}
            variant="outline"
            className="h-12 flex-1 border-2 border-[var(--ink)] text-base font-semibold text-[var(--ink)] hover:bg-[var(--foil-soft)]"
          >
            <Zap className="mr-2 h-5 w-5" />
            Buy now
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="h-11 flex-1 gap-2 text-sm"
            title="Share product"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            onClick={handleCopyReviewLink}
            variant="outline"
            className="h-11 flex-1 gap-2 text-sm"
            title="Copy review link"
          >
            {reviewLinkCopied ? (
              <Check className="h-4 w-4 text-[var(--mint)]" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {reviewLinkCopied ? 'Copied' : 'Review link'}
          </Button>
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3 pt-6">
        {[
          { icon: BadgeCheck, label: '100% genuine', accent: true },
          { icon: Truck, label: 'Free home delivery', accent: false },
          { icon: Shield, label: 'Secure payment', accent: true },
        ].map(({ icon: Icon, label, accent }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-tint)] px-2 py-3 text-center"
          >
            <Icon className={`h-6 w-6 ${accent ? 'text-[var(--mint)]' : 'text-[var(--ink)]'}`} aria-hidden="true" />
            <p className="text-xs font-medium leading-tight text-[var(--ink-70)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Reviews Section */}
      <div className="border-t border-[var(--foil-soft)] pt-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">Customer reviews</h2>
        <ProductReviews productId={product._id} autoOpenReview={autoOpenReview} />
      </div>
    </div>
  );
}
