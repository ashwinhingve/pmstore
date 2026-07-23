"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ProductCard } from "@/components/products/ProductCard"
import { categories as staticCategories } from "@/data/products"
import { Button } from "@/components/ui/button"
import { Filter, X, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Fallback icons when DB categories don't have one
const fallbackIcons: Record<string, string> = {
  "Spices": "🌶️",
  "Spices & Masalas": "🫙",
  "Sweeteners": "🍯",
  "Superfoods": "🌱",
  "Pulses & Grains": "🌾",
  "Dry Fruits": "🥜",
  "Ayurvedic": "🍃",
  "Specialty Powders": "✨",
  "Tea & Beverages": "☕",
  "Cooking Oils & Ghee": "🫒",
}

interface CategoryData {
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
}

// Sidebar sections
const sidebarSections = [
  { id: "all", label: "All Products", icon: "📦" },
  { id: "bestsellers", label: "Bestsellers", icon: "🏆" },
  { id: "newly-in", label: "Newly In", icon: "🆕" },
  { id: "value-buys", label: "Value Buys", icon: "💰" },
  { id: "trending", label: "Trending", icon: "🔥" },
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
  const [products, setProducts] = useState<any[]>([])
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
  const catName = (p: any): string =>
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

  const showSaleBadge = selectedSection === "value-buys"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Horizontal Category Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-[80px] z-30">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center">
            {/* Left Arrow */}
            <button
              onClick={() => scrollCategories("left")}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 flex-shrink-0 z-10"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            {/* Scrollable Category Pills */}
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 px-2 flex-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* All Category */}
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="text-base">🛒</span>
                <span>All</span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedCategory === category.name
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="text-base">{category.icon || fallbackIcons[category.name] || "📦"}</span>
                  <span>{category.name}</span>
                  <span className={`text-xs ${selectedCategory === category.name ? "text-amber-100" : "text-gray-400"}`}>
                    ({categoryCounts[category.name] || 0})
                  </span>
                </button>
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => scrollCategories("right")}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 flex-shrink-0 z-10"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-[160px] space-y-4">
              {/* Section Navigation */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-amber-600 to-red-700">
                  <h3 className="font-bold text-white text-sm">Browse By</h3>
                </div>
                <div className="p-2">
                  {sidebarSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSection === section.id
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-lg">{section.icon}</span>
                      <span>{section.label}</span>
                      {section.id === "all" && (
                        <span className="ml-auto text-xs text-gray-400">({activeProducts.length})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Price Range</h3>
                <div className="flex items-center justify-between text-sm font-medium text-gray-600 mb-2">
                  <span>₹{priceRange[0]}</span>
                  <span>₹{priceRange[1]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  {[
                    { label: "Under ₹200", max: 200 },
                    { label: "₹200-500", max: 500 },
                    { label: "₹500-1K", max: 1000 },
                    { label: "All", max: 2000 },
                  ].map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setPriceRange([0, range.max])}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        priceRange[1] === range.max
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={resetFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Reset All Filters
              </button>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex items-center gap-2">
            <Button
              onClick={() => setShowMobileFilters(true)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-amber-500 focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="name">Sort: Name</option>
              <option value="price-low">Sort: Price Low</option>
              <option value="price-high">Sort: Price High</option>
              <option value="rating">Sort: Rating</option>
            </select>
          </div>

          {/* Mobile Section Pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide -mt-2" style={{ scrollbarWidth: 'none' }}>
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedSection === section.id
                    ? "bg-amber-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1">
            {/* Sort Bar (Desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-4 bg-white px-4 py-3 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> products
                {selectedSection !== "all" && (
                  <span className="ml-1 text-amber-600">
                    in {sidebarSections.find(s => s.id === selectedSection)?.label}
                  </span>
                )}
                {selectedCategory !== "all" && (
                  <span className="ml-1 text-amber-600">/ {selectedCategory}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-gray-600">Sort by:</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-amber-500 focus:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <div className="w-12 h-12 mx-auto mb-4 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Loading products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id || product.id}
                    product={product}
                    showSaleBadge={showSaleBadge}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="w-20 h-20 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-800">No products found</h3>
                <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                  Try adjusting your filters or search query.
                </p>
                <Button
                  onClick={resetFilters}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 overflow-y-auto lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Browse By */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-2">Browse By</h3>
                  <div className="space-y-1">
                    {sidebarSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          setSelectedSection(section.id)
                          setShowMobileFilters(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          selectedSection === section.id
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-lg">{section.icon}</span>
                        <span>{section.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-2">Search</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-2">Categories</h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedCategory("all")
                        setShowMobileFilters(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === "all"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>All Categories</span>
                      <span className="text-xs text-gray-400">({activeProducts.length})</span>
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.slug}
                        onClick={() => {
                          setSelectedCategory(category.name)
                          setShowMobileFilters(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === category.name
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{category.icon || fallbackIcons[category.name] || "📦"}</span>
                          <span>{category.name}</span>
                        </span>
                        <span className="text-xs text-gray-400">({categoryCounts[category.name] || 0})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-2">Price Range</h3>
                  <div className="flex items-center justify-between text-sm font-medium text-gray-600 mb-2">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>

                {/* Reset */}
                <button
                  onClick={() => {
                    resetFilters()
                    setShowMobileFilters(false)
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Reset All Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
