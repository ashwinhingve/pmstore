"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";

interface ProductCardProps {
  product: any;
  showSaleBadge?: boolean;
}

export function ProductCard({ product, showSaleBadge = false }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const productId = product._id || product.id;
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
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleShopNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    router.push('/checkout');
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Handle both old schema (string) and new schema (object with url)
  const getImageUrl = () => {
    if (!product.images || product.images.length === 0) return null;
    const firstImage = product.images[0];
    return typeof firstImage === 'string' ? firstImage : firstImage.url;
  };

  const imageUrl = getImageUrl();
  const isFeatured = product.isFeatured || false;
  const averageRating = product.averageRating || product.average_rating || 0;
  const totalReviews = product.totalReviews || product.review_count || 0;

  // Weight/size display
  const getWeightLabel = () => {
    const weight = product.weight;
    const unit = product.weightUnit || 'g';
    if (!weight) return null;
    if (unit === 'g' && weight >= 1000) return `${weight / 1000} kg`;
    if (unit === 'ml' && weight >= 1000) return `${weight / 1000} L`;
    return `${weight} ${unit}`;
  };
  const weightLabel = getWeightLabel();

  // Check if product is newly added (within last 30 days)
  const isNew = (() => {
    const created = product.createdAt;
    if (!created) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(created) > thirtyDaysAgo;
  })();

  return (
    <Link href={`/products/${product.slug}`}>
      <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 25vw, 20vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="text-center p-6">
                <svg className="w-16 h-16 mx-auto text-amber-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm font-medium text-amber-600">{product.name}</p>
              </div>
            </div>
          )}

          {/* Weight/Size Badge */}
          {weightLabel && (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
              {weightLabel}
            </div>
          )}

          {/* Newly Added Tag */}
          {isNew && (
            <div className="absolute top-0 left-0">
              <div className="bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg shadow-sm uppercase tracking-wider">
                New
              </div>
            </div>
          )}

          {/* Featured Badge */}
          {isFeatured && !isNew && !showSaleBadge && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
              Featured
            </div>
          )}

          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 flex flex-col flex-1">
          {/* Category (populated to { name }; tolerate a legacy string) */}
          <p className="text-xs text-amber-600 font-medium mb-1 uppercase tracking-wide">
            {typeof product.category === 'string' ? product.category : product.category?.name}
          </p>

          {/* Product Name */}
          <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          {averageRating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(averageRating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-200 fill-current"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-gray-400">({totalReviews})</span>
            </div>
          )}

          {/* Price & Add to Cart */}
          <div className="mt-auto pt-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">₹{product.originalPrice}</span>
              )}
              {discount > 0 && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  {discount}% Off
                </span>
              )}
            </div>

            {mounted && itemQuantity > 0 ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (itemQuantity <= 1) {
                      removeItem(productId);
                    } else {
                      updateQuantity(productId, itemQuantity - 1);
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors font-bold text-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center font-bold text-gray-900 text-sm">
                  {itemQuantity} in cart
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addItem(product, 1);
                  }}
                  className="w-9 h-9 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors font-bold text-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={handleShopNow}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-sm h-9"
                >
                  Shop Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 font-semibold text-sm h-9"
                >
                  {isAdding ? "Added!" : "+ ADD"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
