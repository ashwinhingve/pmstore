"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard"
import { PHARMA_CATEGORIES } from "@/lib/categories"
import { SITE_SLOGAN } from "@/lib/constants"
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

// Products shown per page in the grid (client-side pagination over the filtered set).
const PAGE_SIZE = 24

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || "all"
  )
  const [selectedSection, setSelectedSection] = useState<SidebarSection>("all")
  const [sortBy, setSortBy] = useState<string>("featured")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [products, setProducts] = useState<ListingProduct[]>([])
  const [searchResults, setSearchResults] = useState<ListingProduct[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<CategoryData[]>(
    PHARMA_CATEGORIES.map(c => ({ name: c.name, slug: c.slug }))
  )
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the full active catalogue once, then filter/sort/paginate client-side.
    // This suits a single-pharmacy catalogue of a few hundred SKUs; if it grows
    // into the thousands, switch browse to server-side pagination.
    const fetchData = async () => {
      try {
        setLoading(true)
        const categoriesPromise = fetch('/api/categories').catch(() => null)

        const all: ListingProduct[] = []
        let page = 1
        let pages = 1
        do {
          const res = await fetch(`/api/products?limit=50&page=${page}`)
          if (!res.ok) break
          const data = await res.json()
          all.push(...(data.products || []))
          pages = data.pagination?.pages ?? 1
          page++
        } while (page <= pages && page <= 20) // hard cap: 1000 products
        setProducts(all)

        const categoriesRes = await categoriesPromise
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

  // Debounce the search box so we only hit the API when typing pauses.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // Typo-tolerant server search (Atlas Search, with a $text fallback) when a
  // query is present. Empty query returns to the browse catalogue.
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    let ignore = false
    setSearchLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=50`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore) setSearchResults(data?.data?.results ?? [])
      })
      .catch(() => {
        if (!ignore) setSearchResults([])
      })
      .finally(() => {
        if (!ignore) setSearchLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [debouncedQuery])

  // Any query or filter change returns to the first page.
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, selectedCategory, selectedSection, sortBy, priceRange])

  // category is populated to { _id, name, slug }; tolerate a legacy string too
  const catName = (p: ListingProduct): string =>
    typeof p?.category === 'string' ? p.category : p?.category?.name ?? ''

  // In search mode the working set is the (typo-tolerant) server results; the
  // section/category filters below apply only when browsing, since search
  // results carry a lean projection without those fields.
  const isSearchMode = debouncedQuery.length > 0
  const sourceProducts = isSearchMode ? searchResults : products

  const activeProducts = useMemo(() =>
    sourceProducts.filter(p => p.isActive !== false),
    [sourceProducts]
  )

  // Category counts reflect the whole catalogue, so the pills stay stable
  // regardless of the current search or filter.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    products.filter(p => p.isActive !== false).forEach(product => {
      counts[catName(product)] = (counts[catName(product)] || 0) + 1
    })
    return counts
  }, [products])

  // Apply sidebar section filters (uses admin-set flags on products)
  const sectionFilteredProducts = useMemo(() => {
    if (isSearchMode) return activeProducts

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
  }, [activeProducts, selectedSection, isSearchMode])

  // Apply category + price + sort. Text matching is handled server-side (Atlas),
  // so there is no client-side `.includes()` filter here.
  const filteredProducts = useMemo(() => {
    let filtered = [...sectionFilteredProducts]

    if (!isSearchMode && selectedCategory !== "all") {
      filtered = filtered.filter((p) => catName(p) === selectedCategory)
    }

    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    )

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
  }, [sectionFilteredProducts, selectedCategory, sortBy, priceRange, isSearchMode])

  // Client-side pagination over the filtered set.
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const pageProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredProducts, currentPage]
  )

  // If filtering shrinks the result set below the current page, snap back.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [currentPage, totalPages])

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
        aria-label="Search medicines"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] py-2.5 pl-9 pr-3 text-sm transition-colors duration-[var(--dur-fast)] focus:border-[var(--ink-70)] focus:outline-none"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Page header — scrolls away; the category bar below stays sticky */}
      <div className="border-b border-[var(--foil-soft)] bg-[var(--paper-tint)]">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mint-deep)]">
            Catalogue
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-[family-name:var(--font-display)] text-[length:var(--step-2)] font-extrabold tracking-tight text-[var(--ink)]">
              {isSearchMode
                ? "Search results"
                : selectedCategory !== "all"
                  ? selectedCategory
                  : "All medicines"}
            </h1>
            {!loading && (
              <span className="data text-sm text-[var(--ink-70)]">
                {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-70)]">
            {SITE_SLOGAN} — compare brands by price per tablet and switch to genuine, cheaper equivalents.
          </p>
        </div>
      </div>

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

            {/* Mobile scroll affordance — fades the right edge of the pill row */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--paper-card)] to-transparent md:hidden"
            />
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
                {isSearchMode ? (
                  <>
                    result{filteredProducts.length === 1 ? "" : "s"} for
                    <span className="ml-1 text-[var(--ink)]">“{debouncedQuery}”</span>
                  </>
                ) : (
                  <>
                    medicines
                    {selectedSection !== "all" && (
                      <span className="ml-1 text-[var(--mint)]">
                        in {sidebarSections.find(s => s.id === selectedSection)?.label}
                      </span>
                    )}
                    {selectedCategory !== "all" && (
                      <span className="ml-1 text-[var(--mint)]">/ {selectedCategory}</span>
                    )}
                  </>
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
            {(isSearchMode ? searchLoading : loading) ? (
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
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {pageProducts.map((product) => (
                    <ProductCard key={product._id || product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="mt-8 flex items-center justify-center gap-2"
                    aria-label="Product pages"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="min-h-11 gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                    </Button>
                    <span className="data px-3 text-sm text-[var(--ink-70)]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="min-h-11 gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </nav>
                )}
              </>
            ) : (
              <EmptyState
                title={isSearchMode ? "No medicines match your search" : "No medicines match these filters"}
                description={
                  isSearchMode
                    ? "Check the spelling or try the salt name, like paracetamol."
                    : "Try a different category or price range, or clear the filters."
                }
                illustration={<EmptySearchArt />}
                className="bg-[var(--paper-card)]"
              >
                <Button onClick={resetFilters} variant="outline">
                  {isSearchMode ? "Clear search" : "Clear filters"}
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
