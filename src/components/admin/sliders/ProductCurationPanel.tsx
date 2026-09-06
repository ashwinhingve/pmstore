'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { toast } from '@/store/useToastStore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Loader2,
  ImageIcon,
  X,
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  manufacturer: string;
  price: number;
  unitPrice: number;
  images: Array<{ url?: string }>;
  slug: string;
  form?: string;
  category?: any;
}

interface CuratedProduct extends Product {
  order: number;
}

interface Props {
  slot: 'featured' | 'otc';
  title: string;
  description: string;
  initialProducts: Product[];
}

const DEBOUNCE_DELAY = 300;

export default function ProductCurationPanel({
  slot,
  title,
  description,
  initialProducts,
}: Props) {
  const [curatedProducts, setCuratedProducts] = useState<CuratedProduct[]>(
    initialProducts.map((p, i) => ({ ...p, order: i }))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced search for products
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/admin/products?search=${encodeURIComponent(query)}&status=active&limit=10`
          );
          const data = await res.json();
          if (res.ok) {
            // Filter out products already in the curated list
            const curatedIds = new Set(curatedProducts.map((p) => p._id));
            const filtered = (data.products || []).filter(
              (p: Product) => !curatedIds.has(p._id)
            );
            setSearchResults(filtered);
          }
        } catch (err: any) {
          console.error('Search failed:', err);
          toast.error('Search failed. Try again.');
        } finally {
          setIsSearching(false);
        }
      }, DEBOUNCE_DELAY);
    },
    [curatedProducts]
  );

  // Add a product to the curated list
  const handleAdd = (product: Product) => {
    const newOrder = Math.max(...curatedProducts.map((p) => p.order), -1) + 1;
    setCuratedProducts([
      ...curatedProducts,
      {
        ...product,
        order: newOrder,
      },
    ]);
    // Remove from search results
    setSearchResults(searchResults.filter((p) => p._id !== product._id));
    // Don't clear search query; user might add more
  };

  // Remove a product from the curated list
  const handleRemove = (productId: string) => {
    const removed = curatedProducts.find((p) => p._id === productId);
    setCuratedProducts(curatedProducts.filter((p) => p._id !== productId));
    // Re-add to search results if it matches the current query
    if (removed && searchQuery && removed.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      setSearchResults([removed, ...searchResults]);
    }
  };

  // Reorder products
  const moveProduct = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= curatedProducts.length) return;

    const reordered = [...curatedProducts];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    // Update order numbers
    reordered.forEach((p, i) => {
      p.order = i;
    });

    setCuratedProducts(reordered);
  };

  // Save changes to the API
  const handleSave = async () => {
    if (curatedProducts.length === 0) {
      toast.error('Add at least one product to the slider.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/products/sliders/${slot}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: curatedProducts.map((p) => p._id),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to save ${slot} slider`);
      }

      toast.success(`${title} slider saved!`);
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error(`Error saving ${slot} slider:`, err);
      toast.error(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--paper-card)] rounded-xl border border-[var(--foil-soft)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
          <p className="text-sm text-[var(--ink-40)] mt-0.5">{description}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search Section */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-2">
            Search & Add Products
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-40)] pointer-events-none" />
            <Input
              placeholder="Type product name, brand, or salt..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--ink-40)]" />
            )}
          </div>

          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mt-3 max-h-80 overflow-y-auto border border-[var(--foil-soft)] rounded-lg bg-[var(--paper)]">
              {searchResults.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center gap-3 p-3 border-b border-[var(--foil-soft)] last:border-b-0 hover:bg-[var(--foil-soft)] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-[var(--foil-soft)]">
                    {product.images?.[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-[var(--ink-40)]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--ink)] truncate">{product.name}</p>
                    <p className="text-xs text-[var(--ink-40)] truncate">
                      {product.manufacturer} · ₹{product.unitPrice.toFixed(2)}/unit
                    </p>
                  </div>

                  {/* Add Button */}
                  <Button
                    onClick={() => handleAdd(product)}
                    size="sm"
                    className="bg-[var(--brand)] hover:bg-[var(--brand)] text-[var(--paper-card)] flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="mt-3 p-4 text-center border border-dashed border-[var(--foil-soft)] rounded-lg text-[var(--ink-40)] text-sm">
              No products found{curatedProducts.length > 0 ? ' (or already added)' : ''}
            </div>
          )}
        </div>

        {/* Curated List */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-2">
            Curated Products ({curatedProducts.length}/14)
          </label>

          {curatedProducts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[var(--foil-soft)] rounded-xl">
              <ImageIcon className="w-12 h-12 text-[var(--ink-40)] mx-auto mb-3" />
              <p className="text-[var(--ink-40)] font-medium">No products added yet</p>
              <p className="text-sm text-[var(--ink-40)] mt-1">Search and add products above</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {curatedProducts.map((product, index) => (
                <div
                  key={product._id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--foil-soft)] bg-[var(--paper-card)] hover:border-[var(--brand)] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-[var(--foil-soft)]">
                    {product.images?.[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-[var(--ink-40)]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--ink)] truncate">{product.name}</p>
                    <p className="text-xs text-[var(--ink-40)] truncate">
                      {product.manufacturer} · ₹{product.unitPrice.toFixed(2)}/unit
                    </p>
                  </div>

                  {/* Order Badge */}
                  <span className="text-xs font-medium text-[var(--ink-40)] w-6 text-center flex-shrink-0">
                    #{index + 1}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveProduct(index, -1)}
                        disabled={index === 0 || isSaving}
                        className="p-1 rounded hover:bg-[var(--foil-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-[var(--ink-40)]" />
                      </button>
                      <button
                        onClick={() => moveProduct(index, 1)}
                        disabled={index === curatedProducts.length - 1 || isSaving}
                        className="p-1 rounded hover:bg-[var(--foil-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-40)]" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(product._id)}
                      disabled={isSaving}
                      className="p-2 rounded-lg hover:bg-[var(--foil-soft)] text-[var(--ink-70)] transition-colors disabled:opacity-50"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--foil-soft)]">
          <Button
            onClick={handleSave}
            disabled={isSaving || curatedProducts.length === 0}
            className="bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" /> Save Slider
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
