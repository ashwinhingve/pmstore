"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard"
import { categories as staticCategories } from "@/data/products"
import { Button } from "@/components/ui/button"
import { Drawer } from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { EmptySearchArt } from "@/components/illustrations"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Trophy,
  Sparkles,
  BadgeIndianRupee,
  TrendingUp,
  Filter,
} from "lucide-react"

interface CategoryData {
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
}

type ListingProduct = ProductCardData & {
  isActive?: boolean;
  isBestseller?: boolean;
  isValueBuy?: boolean;
  isTrending?: boolean;
  description?: string;
};

// Sidebar sections
const sidebarSections = [
  { id: "all", label: "All medicines", icon: LayoutGrid },
  { id: "bestsellers", label: "Bestsellers", icon: Trophy },
  { id: "newly-in", label: "Newly in", icon: Sparkles },
  { id: "value-buys", label: "Value buys", icon: BadgeIndianRupee },
  { id: "trending", label: "Trending", icon: TrendingUp },
] as const

type SidebarSection = typeof sidebarSections[number]["id"]

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || "all"
  )
  const [selectedSection, setSelectedSection] = useState<SidebarSection>("all")
  const [sortBy, setSortBy] = useState<string>("featured")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [searchQuery, setSearchQuery] = useState("")
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [products, setProducts] = useState<ListingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryData[]>(
    staticCategories.map(c => ({ name: c.name, slug: c.slug }))
  )
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch products and categories in parallel
    const fetchData = async () => {
      try {
        setLoading(true)
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products?limit=50'),
          fetch('/api/categories').catch(() => null),
        ])

        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(data.products || [])
        }

        if (categoriesRes?.ok) {
          const catData = await categoriesRes.json()
          if (catData.categories && catData.categories.length > 0) {
            setCategories(catData.categories)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // category is populated to { _id, name, slug }; tolerate a legacy string too
  const catName = (p: ListingProduct): string =>
    typeof p?.category === 'string' ? p.category : p?.category?.name ?? ''

  const activeProducts = useMemo(() =>
    products.filter(p => p.isActive !== false),
    [products]
  )

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    activeProducts.forEach(product => {
      counts[catName(product)] = (counts[catName(product)] || 0) + 1
    })
    return counts
  }, [activeProducts])

  // Apply sidebar section filters (uses admin-set flags on products)
  const sectionFilteredProducts = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    switch (selectedSection) {
      case "bestsellers":
        return activeProducts.filter(p => p.isBestseller)
      case "newly-in":
        return activeProducts.filter(p => {
          if (!p.createdAt) return false
          return new Date(p.createdAt) > thirtyDaysAgo
        })
      case "value-buys":
        return activeProducts.filter(p => p.isValueBuy)
      case "trending":
        return activeProducts.filter(p => p.isTrending)
      default:
        return activeProducts
    }
  }, [activeProducts, selectedSection])

  // Apply category + price + search + sort
  const filteredProducts = useMemo(() => {
    let filtered = [...sectionFilteredProducts]

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => catName(p) === selectedCategory)
    }

    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    )

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          catName(p).toLowerCase().includes(query)
      )
    }

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "rating":
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        break
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "featured":
      default:
        filtered.sort((a, b) => {
          const aFeatured = a.isFeatured || false
          const bFeatured = b.isFeatured || false
          return (bFeatured ? 1 : 0) - (aFeatured ? 1 : 0)
        })
        break
    }

    return filtered
  }, [sectionFilteredProducts, selectedCategory, sortBy, priceRange, searchQuery])

  const resetFilters = () => {
    setSelectedCategory("all")
    setSelectedSection("all")
    setSortBy("featured")
    setPriceRange([0, 2000])
    setSearchQuery("")
  }

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const categoryPillClass = (active: boolean) =>
    `flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
      active
        ? "bg-[var(--ink)] text-[var(--paper-card)] shadow-[var(--shadow-xs)]"
        : "bg-[var(--foil-soft)] text-[var(--ink-70)] hover:bg-[var(--foil)] hover:text-[var(--ink)]"
    }`

  const sectionButtonClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
      active
        ? "bg-[var(--mint-soft)] text-[var(--ink)]"
        : "text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
    }`

  const filterCardClass =
    "rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)]"

  const priceRangeControls = (
    <>
      <div className="data mb-2 flex items-center justify-between text-sm font-medium text-[var(--ink-70)]">
        <span>₹{priceRange[0]}</span>
        <span>₹{priceRange[1]}</span>
      </div>
      <input
        type="range"
        min="0"
        max="2000"
        step="50"
        aria-label="Maximum price"
        value={priceRange[1]}
        onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-[var(--radius-pill)] bg-[var(--foil-soft)] accent-[var(--mint)]"
      />
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {[
          { label: "Under ₹200", max: 200 },
          { label: "₹200-500", max: 500 },
          { label: "₹500-1K", max: 1000 },
          { label: "All", max: 2000 },
        ].map((range) => (
          <button
            key={range.label}
            onClick={() => setPriceRange([0, range.max])}
            className={`data rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)] ${
              priceRange[1] === range.max
                ? "bg-[var(--mint-soft)] text-[var(--ink)]"
                : "bg-[var(--foil-soft)] text-[var(--ink-70)] hover:bg-[var(--foil)]"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </>
  )

  const searchInput = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-40)]" aria-hidden="true" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Dolo 650, paracetamol…"
        aria-label="Search within results"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] py-2.5 pl-9 pr-3 text-sm transition-colors duration-[var(--dur-fast)] focus:border-[var(--ink-70)] focus:outline-none"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Horizontal Category Bar */}
      <div className="sticky top-[72px] z-30 border-b border-[var(--foil-soft)] bg-[var(--paper-card)]/95 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center">
            <button
              onClick={() => scrollCategories("left")}
              className="z-10 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] md:flex"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--ink-70)]" aria-hidden="true" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <button
                onClick={() => setSelectedCategory("all")}
                className={categoryPillClass(selectedCategory === "all")}
              >
                All
              </button>

              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => setSelectedCategory(category.name)}
                  className={categoryPillClass(selectedCategory === category.name)}
                >
                  <span>{category.name}</span>
                  <span
                    className={`data text-xs ${
                      selectedCategory === category.name ? "text-[var(--foil)]" : "text-[var(--ink-40)]"
                    }`}
                  >
                    {categoryCounts[category.name] || 0}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => scrollCategories("right")}
              className="z-10 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] md:flex"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-4 w-4 text-[var(--ink-70)]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Desktop Sidebar */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-[150px] space-y-4">
              <div className={`${filterCardClass} overflow-hidden`}>
                <h3 className="border-b border-[var(--foil-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
                  Browse by
                </h3>
                <div className="p-2">
                  {sidebarSections.map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSection(section.id)}
                        className={sectionButtonClass(selectedSection === section.id)}
                      >
                        <Icon
                          className={`h-4 w-4 ${selectedSection === section.id ? "text-[var(--mint)]" : "text-[var(--ink-40)]"}`}
                          aria-hidden="true"
                        />
                        <span>{section.label}</span>
                        {section.id === "all" && (
                          <span className="data ml-auto text-xs text-[var(--ink-40)]">
                            {activeProducts.length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={`${filterCardClass} p-4`}>{searchInput}</div>

              <div className={`${filterCardClass} p-4`}>
                <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Price range</h3>
                {priceRangeControls}
              </div>

              <button
                onClick={resetFilters}
                className={`${filterCardClass} flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)]`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Reset filters
              </button>
            </div>
          </aside>

          <div className="flex flex-col gap-4 lg:hidden">
            {/* Mobile Filter Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowMobileFilters(true)}
                variant="outline"
                size="sm"
                className="min-h-11 flex-1"
              >
                <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                Filters
              </Button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort medicines"
                className="min-h-11 flex-1 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] focus:border-[var(--ink-70)] focus:outline-none"
              >
                <option value="featured">Sort: Featured</option>
                <option value="name">Sort: Name</option>
                <option value="price-low">Sort: Price low</option>
                <option value="price-high">Sort: Price high</option>
                <option value="rating">Sort: Rating</option>
              </select>
            </div>

            {/* Mobile Section Pills */}
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sidebarSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)] ${
                      selectedSection === section.id
                        ? "bg-[var(--ink)] text-[var(--paper-card)]"
                        : "border border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink-70)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Sort Bar (Desktop) */}
            <div className="mb-4 hidden items-center justify-between rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3 shadow-[var(--shadow-xs)] lg:flex">
              <div className="text-sm text-[var(--ink-70)]">
                Showing{" "}
                <span className="data font-semibold text-[var(--ink)]">{filteredProducts.length}</span>{" "}
                medicines
                {selectedSection !== "all" && (
                  <span className="ml-1 text-[var(--mint)]">
                    in {sidebarSections.find(s => s.id === selectedSection)?.label}
                  </span>
                )}
                {selectedCategory !== "all" && (
                  <span className="ml-1 text-[var(--mint)]">/ {selectedCategory}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-[var(--ink-70)]">
                  Sort by
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] focus:border-[var(--ink-70)] focus:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="rating">Highest rated</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)]"
                  >
                    <Skeleton className="aspect-square rounded-none" />
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id || product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No medicines match these filters"
                description="Try a different category or price range, or clear the filters."
                illustration={<EmptySearchArt />}
                className="bg-[var(--paper-card)]"
              >
                <Button onClick={resetFilters} variant="outline">
                  Clear filters
                </Button>
              </EmptyState>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        open={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Filters"
        side="left"
        className="lg:hidden"
      >
        <div className="space-y-5 p-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Browse by</h3>
            <div className="space-y-1">
              {sidebarSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setSelectedSection(section.id)
                      setShowMobileFilters(false)
                    }}
                    className={sectionButtonClass(selectedSection === section.id)}
                  >
                    <Icon
                      className={`h-4 w-4 ${selectedSection === section.id ? "text-[var(--mint)]" : "text-[var(--ink-40)]"}`}
                      aria-hidden="true"
                    />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Search</h3>
            {searchInput}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory("all")
                  setShowMobileFilters(false)
                }}
                className={sectionButtonClass(selectedCategory === "all")}
              >
                <span>All categories</span>
                <span className="data ml-auto text-xs text-[var(--ink-40)]">
                  {activeProducts.length}
                </span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => {
                    setSelectedCategory(category.name)
                    setShowMobileFilters(false)
                  }}
                  className={sectionButtonClass(selectedCategory === category.name)}
                >
                  <span>{category.name}</span>
                  <span className="data ml-auto text-xs text-[var(--ink-40)]">
                    {categoryCounts[category.name] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Price range</h3>
            {priceRangeControls}
          </div>

          <button
            onClick={() => {
              resetFilters()
              setShowMobileFilters(false)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--foil-soft)] px-4 py-2.5 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil)]"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Reset filters
          </button>
        </div>
      </Drawer>
    </div>
  )
}
