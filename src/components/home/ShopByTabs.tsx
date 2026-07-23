"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  Check,
  Flame,
  Sparkles,
  BadgePercent,
  TrendingUp,
} from "lucide-react";

interface Product {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: (string | { url: string })[];
  category?: string;
  averageRating?: number;
  totalReviews?: number;
  weight?: number;
  weightUnit?: string;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isTrending?: boolean;
  isValueBuy?: boolean;
  tags?: string[];
  createdAt?: string;
}

interface TabConfig {
  key: string;
  label: string;
  products: Product[];
  color: string;
  activeColor: string;
  badgeLabel: string;
  badgeBg: string;
  icon: React.ReactNode;
}

interface ShopByTabsProps {
  bestsellers: Product[];
  trending: Product[];
  valueBuys: Product[];
  featured: Product[];
}

// ─── Product Card ──────────────────────────────────────────────
function TabProductCard({
  product,
  badgeLabel,
  badgeBg,
}: {
  product: Product;
  badgeLabel: string;
  badgeBg: string;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const productId = product._id || product.id || "";
  const addItem = useCartStore((state) => state.addItem);
  const itemQuantity = useCartStore((state) => state.getItemQuantity(productId));
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addItem(product as any, 1);
    setTimeout(() => setIsAdding(false), 1200);
  };

  const handleShopNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/products/${product.slug}`);
  };

  const getImageUrl = () => {
    if (!product.images || product.images.length === 0) return null;
    const first = product.images[0];
    return typeof first === "string" ? first : first.url;
  };

  const imageUrl = getImageUrl();
  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : 0;

  const getWeightLabel = () => {
    const w = product.weight;
    const u = product.weightUnit || "g";
    if (!w) return null;
    if (u === "g" && w >= 1000) return `${w / 1000} kg`;
    if (u === "ml" && w >= 1000) return `${w / 1000} L`;
    return `${w} ${u}`;
  };
  const weightLabel = getWeightLabel();

  const inCart = mounted && itemQuantity > 0;

  return (
    <Link href={`/products/${product.slug}`} className="block h-full">
      <div className="group bg-white rounded-2xl overflow-hidden h-full flex flex-col shadow-sm hover:shadow-xl border border-gray-100 hover:border-amber-200 transition-all duration-300">
        {/* Image container */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
              <p className="text-sm font-medium text-amber-600 text-center px-3">
                {product.name}
              </p>
            </div>
          )}

          {/* Top badges row */}
          <div className="absolute top-0 left-0 right-0 p-2.5 flex items-start justify-between">
            {/* Category badge */}
            <span
              className={`${badgeBg} text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg shadow-md`}
            >
              {badgeLabel}
            </span>

            {/* Discount badge */}
            {discount > 0 && (
              <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg shadow-md">
                -{discount}%
              </span>
            )}
          </div>

          {/* Weight badge */}
          {weightLabel && (
            <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-sm text-gray-700 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {weightLabel}
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          {/* Rating */}
          {product.averageRating && product.averageRating > 0 && (
            <div className="flex items-center gap-1 mb-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-gray-700">
                {product.averageRating.toFixed(1)}
              </span>
              {product.totalReviews && product.totalReviews > 0 && (
                <span className="text-[10px] text-gray-400">
                  ({product.totalReviews})
                </span>
              )}
            </div>
          )}

          {/* Product name */}
          <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 line-clamp-2 group-hover:text-amber-700 transition-colors leading-snug min-h-[2.5em]">
            {product.name}
          </h3>

          {/* Price + CTA */}
          <div className="mt-auto pt-2.5">
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs sm:text-sm text-gray-400 line-through">
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handleShopNow}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm h-9 sm:h-10 rounded-xl transition-all duration-200"
              >
                Shop Now
              </Button>
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isAdding}
                className={`w-full font-semibold text-xs sm:text-sm h-9 sm:h-10 rounded-xl transition-all duration-200 ${
                  isAdding
                    ? "bg-green-500 hover:bg-green-500 text-white"
                    : inCart
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white"
                }`}
              >
                {isAdding ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Added!
                  </span>
                ) : inCart ? (
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4" /> In Cart ({itemQuantity})
                    &middot; Add More
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main ShopByTabs Component ─────────────────────────────────
export function ShopByTabs({
  bestsellers,
  trending,
  valueBuys,
  featured,
}: ShopByTabsProps) {
  const tabs: TabConfig[] = [
    {
      key: "bestsellers",
      label: "Bestsellers",
      products: bestsellers,
      color: "text-amber-700",
      activeColor: "from-amber-500 to-orange-600",
      badgeLabel: "Bestseller",
      badgeBg: "bg-amber-600",
      icon: <Flame className="w-4 h-4" />,
    },
    {
      key: "featured",
      label: "New Arrivals",
      products: featured,
      color: "text-emerald-700",
      activeColor: "from-emerald-500 to-green-600",
      badgeLabel: "New",
      badgeBg: "bg-emerald-600",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      key: "valueBuys",
      label: "Value Buys",
      products: valueBuys,
      color: "text-red-700",
      activeColor: "from-red-500 to-rose-600",
      badgeLabel: "Value",
      badgeBg: "bg-red-600",
      icon: <BadgePercent className="w-4 h-4" />,
    },
    {
      key: "trending",
      label: "Trending",
      products: trending,
      color: "text-violet-700",
      activeColor: "from-violet-500 to-purple-600",
      badgeLabel: "Trending",
      badgeBg: "bg-violet-600",
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ].filter((t) => t.products.length > 0);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "bestsellers");
  const [currentPage, setCurrentPage] = useState(0);
  const [productsPerPage, setProductsPerPage] = useState(4);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setProductsPerPage(2);
      else if (window.innerWidth < 1024) setProductsPerPage(3);
      else setProductsPerPage(4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab]);

  const activeConfig = tabs.find((t) => t.key === activeTab) || tabs[0];
  if (!activeConfig) return null;

  const totalPages = Math.ceil(activeConfig.products.length / productsPerPage);
  const visibleProducts = activeConfig.products.slice(
    currentPage * productsPerPage,
    (currentPage + 1) * productsPerPage
  );

  const goNext = useCallback(() => {
    setCurrentPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => (p - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // Auto-slide: advances one page every 1.5s, always
  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(goNext, 3000);
    return () => clearInterval(timer);
  }, [totalPages, goNext]);

  return (
    <section
      className="py-12 md:py-20 bg-gradient-to-b from-gray-50/80 to-white relative overflow-hidden"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <p className="text-amber-600 font-semibold text-sm tracking-widest uppercase mb-2">
            Curated For You
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
            Shop By
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-12 h-1 bg-amber-500 rounded-full" />
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-12 h-1 bg-amber-500 rounded-full" />
          </div>
        </div>

        {/* Tabs — centered */}
        <div
          className="flex justify-center gap-2 sm:gap-3 mb-8 md:mb-10 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 sm:px-7 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.activeColor} text-white shadow-lg scale-105`
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.products.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Products Carousel */}
        <div className="relative" ref={gridRef}>
          {/* Navigation Arrows */}
          {totalPages > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200 group/btn"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 group-hover/btn:text-amber-700" />
              </button>
              <button
                onClick={goNext}
                className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200 group/btn"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover/btn:text-amber-700" />
              </button>
            </>
          )}

          {/* Product Grid */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 px-1 sm:px-2 transition-opacity duration-500"
            style={{ opacity: 1, animation: 'fadeIn 0.4s ease' }}
            key={`${activeTab}-${currentPage}`}
          >
            {visibleProducts.map((product) => (
              <TabProductCard
                key={product._id || product.id}
                product={product}
                badgeLabel={activeConfig.badgeLabel}
                badgeBg={activeConfig.badgeBg}
              />
            ))}
          </div>

          {/* Pagination Dots */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`rounded-full transition-all duration-300 ${
                    idx === currentPage
                      ? "w-8 h-2.5 bg-gradient-to-r " + activeConfig.activeColor
                      : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to page ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
