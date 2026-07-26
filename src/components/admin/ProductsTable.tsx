'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BulkActionDrawer, type BulkAction } from '@/components/admin/BulkActionDrawer';
import { toast } from '@/store/useToastStore';
import {
  Search,
  Plus,
  Upload,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  PackageX,
  Package,
  AlertTriangle,
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  category: { _id: string; name: string; slug: string } | string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: Array<{ url: string; publicId: string }>;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isTrending: boolean;
  isValueBuy: boolean;
  createdAt: string;
}

interface ProductsTableProps {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    categories: Array<{ _id: string; count: number; name?: string; slug?: string }>;
    statuses: Array<{ _id: boolean; count: number }>;
    stockLevels: Array<{ _id: string; count: number }>;
  };
  currentFilters: {
    search: string;
    category: string;
    status: string;
    stockLevel: string;
    sortBy: string;
    sortOrder: string;
  };
}

function BulkBarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--ink-10)]/40 px-3 text-sm font-semibold text-[var(--paper-card)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
    >
      {children}
    </button>
  );
}

export default function ProductsTable({
  products,
  pagination,
  filters,
  currentFilters,
}: ProductsTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p._id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p._id)));
  };

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const newFilters = { ...currentFilters, ...updates };

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/admin/products?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput, page: '1' });
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(productId);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      toast.success('Product deleted');
      router.refresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error("Couldn't delete the product. Try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product status');
      }

      toast.success('Product status updated');
      router.refresh();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error("Couldn't update the product status. Try again.");
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-[var(--ink-70)] bg-[var(--foil-soft)]', icon: PackageX };
    if (stock <= 10) return { label: 'Low Stock', color: 'text-[var(--ink-70)] bg-[var(--foil-soft)]', icon: AlertTriangle };
    return { label: 'In Stock', color: 'text-[var(--mint)] bg-[var(--mint-soft)]', icon: Package };
  };

  return (
    <div className="bg-[var(--paper-card)] rounded-lg shadow">
      {/* Header Actions */}
      <div className="p-4 border-b border-[var(--foil-soft)]">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ink-40)] w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <Link href="/admin/products/import">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </Link>

          <Link href="/admin/products/new">
            <Button className="bg-[var(--mint)] hover:bg-[var(--mint)] text-[var(--paper-card)]">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={currentFilters.category}
            onChange={(e) => updateFilters({ category: e.target.value, page: '1' })}
            className="px-3 py-2 border border-[var(--foil-soft)] rounded-md text-sm bg-[var(--paper-card)] text-[var(--ink)]"
          >
            <option value="">All Categories</option>
            {filters.categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name ?? 'Uncategorized'} ({cat.count})
              </option>
            ))}
          </select>

          <select
            value={currentFilters.status}
            onChange={(e) => updateFilters({ status: e.target.value, page: '1' })}
            className="px-3 py-2 border border-[var(--foil-soft)] rounded-md text-sm bg-[var(--paper-card)] text-[var(--ink)]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={currentFilters.stockLevel}
            onChange={(e) => updateFilters({ stockLevel: e.target.value, page: '1' })}
            className="px-3 py-2 border border-[var(--foil-soft)] rounded-md text-sm bg-[var(--paper-card)] text-[var(--ink)]"
          >
            <option value="">All Stock Levels</option>
            <option value="available">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={`${currentFilters.sortBy}-${currentFilters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              updateFilters({ sortBy, sortOrder });
            }}
            className="px-3 py-2 border border-[var(--foil-soft)] rounded-md text-sm bg-[var(--paper-card)] text-[var(--ink)]"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
            <option value="stock-asc">Stock (Low to High)</option>
            <option value="stock-desc">Stock (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-3 bg-[var(--foil-soft)] border-b border-[var(--foil-soft)]">
        <p className="text-sm text-[var(--ink-70)]">
          Showing {products.length} of {pagination.total} products
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 border-b border-[var(--foil)] bg-[var(--paper-tint)]">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Select all products on this page"
                  className="h-5 w-5 cursor-pointer accent-[var(--ink)]"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--ink-70)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--foil-soft)]">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[var(--ink-40)]">
                  No products found. Try adjusting your filters or create a new product.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const StockIcon = stockStatus.icon;

                return (
                  <tr
                    key={product._id}
                    className={
                      selectedIds.has(product._id)
                        ? 'bg-[var(--paper-tint)]'
                        : 'hover:bg-[var(--foil-soft)]'
                    }
                  >
                    <td className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product._id)}
                        onChange={() => toggleSelect(product._id)}
                        aria-label={`Select ${product.name}`}
                        className="h-5 w-5 cursor-pointer accent-[var(--ink)]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0 bg-[var(--foil-soft)] rounded overflow-hidden">
                          {product.images[0]?.url ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--ink-40)]">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--ink)]">{product.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {product.isFeatured && (
                              <span className="inline-block px-2 py-0.5 bg-[var(--mint-soft)] text-[var(--mint)] text-xs rounded">
                                Featured
                              </span>
                            )}
                            {product.isBestseller && (
                              <span className="inline-block px-2 py-0.5 bg-[var(--mint-soft)] text-[var(--mint)] text-xs rounded">
                                Bestseller
                              </span>
                            )}
                            {product.isTrending && (
                              <span className="inline-block px-2 py-0.5 bg-[var(--mint-soft)] text-[var(--mint)] text-xs rounded">
                                Trending
                              </span>
                            )}
                            {product.isValueBuy && (
                              <span className="inline-block px-2 py-0.5 bg-[var(--mint-soft)] text-[var(--mint)] text-xs rounded">
                                Value Buy
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--ink-70)]" style={{ fontFamily: 'var(--font-data)' }}>
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--ink-70)]">
                      {typeof product.category === 'string'
                        ? product.category
                        : product.category?.name}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <p className="font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--font-data)' }}>₹{product.price.toLocaleString('en-IN')}</p>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <p className="text-xs text-[var(--ink-40)] line-through" style={{ fontFamily: 'var(--font-data)' }}>
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        <StockIcon className="w-3.5 h-3.5" />
                        {product.stock}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleActive(product._id, product.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          product.isActive
                            ? 'bg-[var(--mint-soft)] text-[var(--mint)]'
                            : 'bg-[var(--foil-soft)] text-[var(--ink-70)]'
                        }`}
                      >
                        {product.isActive ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/products/${product._id}`}>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product._id, product.name)}
                          disabled={isDeleting === product._id}
                          className="text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-[var(--foil-soft)]"
                        >
                          {isDeleting === product._id ? (
                            <div className="w-4 h-4 border-2 border-[var(--ink-70)] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar — pins to the viewport bottom while rows are in view */}
      {someSelected && (
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-b-lg bg-[var(--ink)] px-4 py-3 shadow-[var(--shadow-lg)]">
          <p className="text-sm font-medium text-[var(--paper-card)]">
            <span className="data font-semibold">{selectedIds.size}</span>{' '}
            {selectedIds.size === 1 ? 'product' : 'products'} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <BulkBarButton onClick={() => setBulkAction('price')}>Set price</BulkBarButton>
            <BulkBarButton onClick={() => setBulkAction('stock')}>Set stock</BulkBarButton>
            <BulkBarButton onClick={() => setBulkAction('activate')}>Activate</BulkBarButton>
            <BulkBarButton onClick={() => setBulkAction('deactivate')}>Deactivate</BulkBarButton>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--ink-10)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--paper-card)]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <BulkActionDrawer
        action={bulkAction}
        selectedIds={[...selectedIds]}
        onClose={() => setBulkAction(null)}
        onDone={() => {
          setBulkAction(null);
          setSelectedIds(new Set());
          router.refresh();
        }}
      />

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-4 py-4 border-t border-[var(--foil-soft)]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--ink-70)]">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateFilters({ page: String(pagination.page - 1) })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateFilters({ page: String(pagination.page + 1) })}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
