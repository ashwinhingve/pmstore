"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
}

interface ShopByCategoryProps {
  categories: CategoryItem[];
}

export function ShopByCategory({ categories }: ShopByCategoryProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <p className="text-amber-600 font-semibold text-sm tracking-widest uppercase mb-2">
            Browse Collection
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
            Shop By Category
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-12 h-1 bg-amber-500 rounded-full" />
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-12 h-1 bg-amber-500 rounded-full" />
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
          {categories.map((cat) => (
            <CategoryCircle key={cat._id} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCircle({ cat }: { cat: CategoryItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/products?category=${encodeURIComponent(cat.name)}`}
      className="group flex flex-col items-center gap-3"
    >
      {/* Circular image with thick ring */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-[4px] border-yellow-500 group-hover:border-amber-600 transition-colors duration-300 shadow-md group-hover:shadow-xl" />
        {/* Inner circle with image */}
        <div className="absolute inset-[6px] rounded-full overflow-hidden bg-amber-50">
          {cat.image && !imgError ? (
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 160px"
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
              <span className="text-4xl md:text-5xl drop-shadow-sm">
                {cat.icon || "🛒"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category name */}
      <p className="text-sm md:text-base font-bold text-gray-800 group-hover:text-amber-700 transition-colors text-center leading-tight">
        {cat.name}
      </p>
    </Link>
  );
}
