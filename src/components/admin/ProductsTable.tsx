'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
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
  category: string;
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
    categories: Array<{ _id: string; count: number }>;
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

export default function ProductsTable({
  products,
  pagination,
  filters,
  currentFilters,
}: ProductsTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

      router.refresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
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

      router.refresh();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product status. Please try again.');
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50', icon: PackageX };
    if (stock <= 10) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle };
    return { label: 'In Stock', color: 'text-green-600 bg-green-50', icon: Package };
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header Actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <Link href="/admin/products/new">
            <Button className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800">
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
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Categories</option>
            {filters.categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat._id} ({cat.count})
              </option>
            ))}
          </select>

          <select
            value={currentFilters.status}
            onChange={(e) => updateFilters({ status: e.target.value, page: '1' })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={currentFilters.stockLevel}
            onChange={(e) => updateFilters({ stockLevel: e.target.value, page: '1' })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
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
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-600">
          Showing {products.length} of {pagination.total} products
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No products found. Try adjusting your filters or create a new product.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const StockIcon = stockStatus.icon;

                return (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          {product.images[0]?.url ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {product.isFeatured && (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                                Featured
                              </span>
                            )}
                            {product.isBestseller && (
                              <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                Bestseller
                              </span>
                            )}
                            {product.isTrending && (
                              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                Trending
                              </span>
                            )}
                            {product.isValueBuy && (
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                Value Buy
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {product.category}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">₹{product.price.toLocaleString()}</p>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <p className="text-xs text-gray-500 line-through">
                            ₹{product.originalPrice.toLocaleString()}
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
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
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
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isDeleting === product._id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
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
