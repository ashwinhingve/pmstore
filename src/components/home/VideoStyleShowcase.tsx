"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, ShoppingBag, Pause } from "lucide-react";

interface ShowcaseProduct {
  _id: string;
  name: string;
  slug: string;
  images: { url: string }[];
  price: number;
  originalPrice?: number;
  averageRating: number;
  videoUrl?: string;
  tags?: string[];
  isBestseller?: boolean;
  isFeatured?: boolean;
}

interface VideoStyleShowcaseProps {
  products: ShowcaseProduct[];
}

export function VideoStyleShowcase({ products }: VideoStyleShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollRef.current) {
      const cardWidth = 220;
      const gap = 16;
      const scrollAmount = cardWidth + gap;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 236;
      setActiveIndex(Math.round(scrollLeft / cardWidth));
    }
  };

  // Auto-slide logic
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      if (scrollRef.current) {
        const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
        if (scrollRef.current.scrollLeft >= maxScroll - 10) {
          // Reset to start
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scroll("right");
        }
      }
    }, 3000);
  }, [scroll]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAutoPlaying && products.length > 0) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
    return () => stopAutoPlay();
  }, [isAutoPlaying, products.length, startAutoPlay, stopAutoPlay]);

  // Pause on hover
  const handleMouseEnter = () => {
    if (isAutoPlaying) stopAutoPlay();
  };
  const handleMouseLeave = () => {
    if (isAutoPlaying) startAutoPlay();
  };

  if (!products || products.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Scroll Arrows */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* Cards Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => {
          const imageUrl = product.images?.[0]?.url;
          const discount = product.originalPrice
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : 0;

          return (
            <div
              key={product._id}
              className="flex-shrink-0 snap-start w-[200px] sm:w-[220px]"
            >
              {/* Reels-style Portrait Card */}
              <Link href={`/products/${product.slug}`}>
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
                  {/* Product Image */}
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 200px, 220px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                      <span className="text-amber-600 font-medium text-sm text-center px-3">{product.name}</span>
                    </div>
                  )}

                  {/* Play icon */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
                      <Play className="w-4 h-4 text-red-600 fill-red-600 ml-0.5" />
                    </div>
                  </div>

                  {/* Discount badge */}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-md">
                        {discount}% OFF
                      </span>
                    </div>
                  )}

                  {/* Bottom gradient overlay with product info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-16 pb-4 px-3">
                    <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-white font-bold text-base">
                        ₹{product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-white/50 text-xs line-through">
                          ₹{product.originalPrice}
                        </span>
                      )}
                    </div>

                    {/* Shop Now button */}
                    <div className="flex items-center justify-center gap-1.5 bg-white text-gray-900 rounded-lg py-2 text-xs font-bold hover:bg-amber-50 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Shop Now
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom row: dots + auto-play toggle */}
      <div className="flex items-center justify-center gap-3 mt-4">
        {/* Dot Indicators */}
        <div className="flex gap-1.5">
          {products.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-6 bg-amber-600"
                  : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Auto-play toggle */}
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            isAutoPlaying
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          aria-label={isAutoPlaying ? "Pause auto-slide" : "Play auto-slide"}
        >
          {isAutoPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          {isAutoPlaying ? "Auto" : "Paused"}
        </button>
      </div>
    </div>
  );
}
