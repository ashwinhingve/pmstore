'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Package, Check, Share2, Shield, Truck, BadgeCheck, Link2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { toast } from '@/store/useToastStore';
import type { ScheduleClass } from '@/lib/pharma/format';
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
    ? { label: 'Out of Stock', color: 'text-[var(--ink-70)]', available: false }
    : currentStock <= 10
    ? { label: `Only ${currentStock} left!`, color: 'text-[var(--ink)]', available: true }
    : { label: 'In Stock', color: 'text-[var(--mint)]', available: true };

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
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--ink)] mb-2">
          {product.name}
        </h1>
        <p className="text-sm text-[var(--ink-40)] data">SKU: {product.sku}</p>
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

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-[var(--ink)]">
          ₹{currentPrice.toLocaleString()}
        </span>
        {currentOriginalPrice && currentOriginalPrice > currentPrice && (
          <>
            <span className="text-2xl text-[var(--ink-40)] line-through">
              ₹{currentOriginalPrice.toLocaleString()}
            </span>
            <span className="px-3 py-1 bg-[var(--mint-soft)] text-[var(--mint)] rounded-full text-sm font-medium">
              {discount}% OFF
            </span>
          </>
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
        <label className="block text-sm font-medium text-[var(--ink)] mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-lg border border-[var(--foil-soft)] flex items-center justify-center hover:bg-[var(--foil-soft)] transition-colors text-[var(--ink)]"
            disabled={!stockStatus.available}
          >
            -
          </button>
          <span className="w-16 text-center font-medium text-lg text-[var(--ink)]">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
            className="w-10 h-10 rounded-lg border border-[var(--foil-soft)] flex items-center justify-center hover:bg-[var(--foil-soft)] transition-colors text-[var(--ink)]"
            disabled={!stockStatus.available || quantity >= currentStock}
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Cart + Buy Now Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleAddToCart}
          disabled={!stockStatus.available || isAdding}
          className="flex-1 h-14 text-lg bg-[var(--ink)] hover:opacity-90"
        >
          {isAdding ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Added to Cart!
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart
            </>
          )}
        </Button>

        <Button
          onClick={handleBuyNow}
          disabled={!stockStatus.available}
          variant="outline"
          className="flex-1 h-14 text-lg border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--foil-soft)]"
        >
          <Zap className="w-5 h-5 mr-2" />
          Buy Now
        </Button>

        <Button
          onClick={handleShare}
          variant="outline"
          className="h-14"
          title="Share product"
        >
          <Share2 className="w-5 h-5" />
        </Button>

        <Button
          onClick={handleCopyReviewLink}
          variant="outline"
          className="h-14 gap-2 text-sm"
          title="Copy review link"
        >
          {reviewLinkCopied ? (
            <Check className="w-5 h-5 text-[var(--mint)]" />
          ) : (
            <Link2 className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">
            {reviewLinkCopied ? 'Copied!' : 'Review Link'}
          </span>
        </Button>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--foil-soft)]">
        <div className="text-center">
          <Shield className="w-8 h-8 mx-auto mb-2 text-[var(--mint)]" />
          <p className="text-xs text-[var(--ink-70)]">Secure Payment</p>
        </div>
        <div className="text-center">
          <Truck className="w-8 h-8 mx-auto mb-2 text-[var(--ink)]" />
          <p className="text-xs text-[var(--ink-70)]">Fast Delivery</p>
        </div>
        <div className="text-center">
          <BadgeCheck className="w-8 h-8 mx-auto mb-2 text-[var(--mint)]" />
          <p className="text-xs text-[var(--ink-70)]">100% Authentic</p>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-[var(--foil-soft)] pt-6">
        <h2 className="text-xl font-bold text-[var(--ink)] mb-4">Customer Reviews</h2>
        <ProductReviews productId={product._id} autoOpenReview={autoOpenReview} />
      </div>
    </div>
  );
}
