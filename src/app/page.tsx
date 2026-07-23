// Force SSR so MongoDB is queried on every request — new/updated products always appear
export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { VideoStyleShowcase } from "@/components/home/VideoStyleShowcase";
import { ShopByTabs } from "@/components/home/ShopByTabs";
import { TrustBadges } from "@/components/home/TrustBadges";
import { ProductionShowcase } from "@/components/home/ProductionShowcase";
import { PartnerLogos } from "@/components/home/PartnerLogos";
import { WhatsAppButton } from "@/components/home/WhatsAppButton";
import { ShopNowButton } from "@/components/home/ShopNowButton";
import connectDB from "@/lib/mongodb/connection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import SiteSettings from "@/models/SiteSettings";
import {
  Wheat,
  Heart,
  Leaf,
  Shield,
  Sparkles,
} from "lucide-react";

async function getHomeData() {
  await connectDB();

  const [bestsellers, trending, valueBuys, featured, categories, siteSettings] =
    await Promise.all([
      Product.find({ isActive: true, isBestseller: true })
        .select("name slug price originalPrice images category averageRating totalReviews weight weightUnit isFeatured isBestseller tags")
        .limit(12)
        .lean(),
      Product.find({ isActive: true, isTrending: true })
        .select("name slug price originalPrice images category averageRating totalReviews weight weightUnit isFeatured isTrending tags")
        .limit(12)
        .lean(),
      Product.find({ isActive: true, isValueBuy: true })
        .select("name slug price originalPrice images category averageRating totalReviews weight weightUnit isFeatured isValueBuy tags")
        .limit(12)
        .lean(),
      Product.find({ isActive: true, isFeatured: true })
        .select("name slug price originalPrice images category averageRating totalReviews videoUrl isBestseller isFeatured tags")
        .limit(8)
        .lean(),
      Category.find({ isActive: true }).sort({ order: 1 }).lean(),
      SiteSettings.findOne({ key: 'global' }).lean(),
    ]);

  // Serialize MongoDB documents (convert _id, dates, etc.)
  const serialize = (docs: any[]) =>
    JSON.parse(JSON.stringify(docs));

  // Extract active hero slides from settings, sorted by order
  const rawSlides = (siteSettings as any)?.heroSlider?.slides || [];
  const heroSlides = JSON.parse(JSON.stringify(
    rawSlides
      .filter((s: any) => s.isActive !== false)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  ));

  return {
    bestsellers: serialize(bestsellers),
    trending: serialize(trending),
    valueBuys: serialize(valueBuys),
    featured: serialize(featured),
    categories: serialize(categories),
    heroSlides,
  };
}

export default async function Home() {
  const { bestsellers, trending, valueBuys, featured, categories, heroSlides } =
    await getHomeData();

  // Get first 4 featured product images for hero & spotlight sections
  const heroImages = featured.slice(0, 4).map((p: any) => ({
    url: p.images?.[0]?.url || "",
    name: p.name || "Product",
  }));

  return (
    <main>
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Hero Slider */}
      <HeroSlider slides={heroSlides} />

      
      {/* Shop By Category */}
      <ShopByCategory categories={categories} />

      {/* Shop By — Tabbed Products (Bestsellers, Newly In, Value Buys, Trending) */}
      <ShopByTabs
        bestsellers={bestsellers}
        trending={trending}
        valueBuys={valueBuys}
        featured={featured}
      />

      {/* Watch & Shop — Featured Products */}
      {featured.length > 0 && (
        <section className="py-12 md:py-20 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(217,119,6,0.08),transparent_60%)]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white fill-white ml-0.5" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                  Watch & Shop
                </h2>
              </div>
              <p className="text-gray-500 mt-2">
                Handpicked premium products loved by our customers
              </p>
              <div className="w-20 h-1 bg-gradient-to-r from-amber-500 to-red-600 mx-auto mt-3"></div>
            </div>
            <VideoStyleShowcase products={featured} />
          </div>
        </section>
      )}

      {/* What Makes Our Spices Better — Product Spotlight */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-amber-50 via-white to-red-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMy4zMTQgMi42ODYtNiA2LTZzNi0yLjY4NiA2LTYtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6TTEyIDM2YzAtMy4zMTQgMi42ODYtNiA2LTZzNi0yLjY4NiA2LTYtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left Content */}
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
                What Makes Our Spices Better?
              </h2>
              <h3 className="text-2xl font-semibold mb-6 text-amber-800">
                Goodness Inside, Quality Outside
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                TAPTIFS spices are a wholesome fusion of tradition and taste,
                crafted with nutrient-rich ingredients sourced from the finest farms.
                Available in delightful variants, each spice offers a unique flavor
                experience. Made with care and natural ingredients, they are ideal for
                everyday cooking—delicious, healthy, and packed with Love.
              </p>
              <Link href="/products">
                <Button size="lg" className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800 text-white px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
                  VISIT SHOP
                </Button>
              </Link>
            </div>

            {/* Right Image — Multi-Product Collage */}
            <div className="flex-1">
              <div className="relative">
                {/* Main circular gradient background */}
                <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 rounded-full w-full aspect-square flex items-center justify-center relative overflow-hidden shadow-2xl border-4 border-white">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-300/20 via-transparent to-red-300/15 rounded-full"></div>

                  <div className="relative w-[85%] h-[85%] rounded-full bg-gradient-to-br from-amber-100/95 to-orange-100/90 p-4 shadow-inner">
                    <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
                      {heroImages.map((img: { url: string; name: string }, i: number) => (
                        <div key={i} className="relative group rounded-2xl overflow-hidden shadow-lg aspect-square">
                          {img.url ? (
                            <Image
                              src={img.url}
                              alt={img.name}
                              width={512}
                              height={512}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                              <span className="text-amber-600 font-medium text-sm">{img.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-2 left-2 text-white text-xs font-bold">{img.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Center premium badge */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="bg-gradient-to-r from-amber-600 to-red-700 text-white px-4 py-2 rounded-full font-bold shadow-2xl border-2 border-white text-xs md:text-sm whitespace-nowrap">
                        Premium Quality
                      </div>
                    </div>
                  </div>
                </div>

                {/* Callout badges */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-3 rounded-xl shadow-xl transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    <p className="font-bold text-sm">100% Natural</p>
                  </div>
                </div>

                <div className="absolute top-1/4 -left-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white px-4 py-3 rounded-xl shadow-xl transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Wheat className="w-4 h-4" />
                    <p className="font-bold text-sm">High in Fiber</p>
                  </div>
                </div>

                <div className="absolute bottom-1/4 -right-6 bg-gradient-to-br from-red-500 to-red-700 text-white px-4 py-3 rounded-xl shadow-xl transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <p className="font-bold text-sm">Heart Healthy</p>
                  </div>
                </div>

                <div className="absolute -bottom-4 left-1/4 bg-gradient-to-br from-purple-500 to-purple-700 text-white px-4 py-3 rounded-xl shadow-xl transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <p className="font-bold text-sm">Certified Quality</p>
                  </div>
                </div>

                <div className="absolute top-3/4 -left-4 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white px-4 py-3 rounded-xl shadow-xl transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <p className="font-bold text-sm">Fresh & Pure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose TAPTIFS — Trust Badges */}
      <TrustBadges />

      {/* Production Process */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-amber-50 via-white to-red-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMy4zMTQgMi42ODYtNiA2LTZzNi0yLjY4NiA2LTYtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6TTEyIDM2YzAtMy4zMTQgMi42ODYtNiA2LTZzNi0yLjY4NiA2LTYtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative z-10">
          <ProductionShowcase />
        </div>
      </section>

      {/* Available On — Partner Logos */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <PartnerLogos />
        </div>
      </section>

      {/* Floating Buttons */}
      <ShopNowButton />
      <WhatsAppButton />
    </main>
  );
}
