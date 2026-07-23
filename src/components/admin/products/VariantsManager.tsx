'use client';

import { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductVariantData } from '@/lib/validations/product';

interface VariantsManagerProps {
  variants: ProductVariantData[];
  onChange: (variants: ProductVariantData[]) => void;
  parentSKU?: string;
}

export default function VariantsManager({
  variants,
  onChange,
  parentSKU = '',
}: VariantsManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductVariantData>>({});

  const addVariant = () => {
    const newVariant: ProductVariantData = {
      id: `var-${Date.now()}`,
      name: '',
      sku: `${parentSKU}-VAR${variants.length + 1}`,
      price: 0,
      stock: 0,
      isActive: true,
    };
    onChange([...variants, newVariant]);
    setEditingIndex(variants.length);
    setEditForm(newVariant);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...variants[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null) return;

    const updated = variants.map((v, i) =>
      i === editingIndex ? { ...v, ...editForm } : v
    );
    onChange(updated);
    setEditingIndex(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    // If it's a new variant (empty name), remove it
    if (editingIndex !== null && !variants[editingIndex].name) {
      removeVariant(editingIndex);
    }
    setEditingIndex(null);
    setEditForm({});
  };

  const removeVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    onChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditForm({});
    }
  };

  const toggleActive = (index: number) => {
    const updated = variants.map((v, i) =>
      i === index ? { ...v, isActive: !v.isActive } : v
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Variants List */}
      {variants.length > 0 && (
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={variant.id}
              className={`p-4 rounded-lg border-2 transition-colors ${
                editingIndex === index
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {editingIndex === index ? (
                // Edit Mode
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Variant Name *
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., 500g Pack"
                        value={editForm.name || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU *
                      </label>
                      <Input
                        type="text"
                        placeholder="Product SKU"
                        value={editForm.sku || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, sku: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (₹) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price || 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Original Price (₹)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.originalPrice || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            originalPrice: parseFloat(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={editForm.stock || 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="500"
                        value={editForm.weight || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, weight: parseFloat(e.target.value) || undefined })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight Unit
                      </label>
                      <select
                        value={editForm.weightUnit || 'g'}
                        onChange={(e) =>
                          setEditForm({ ...editForm, weightUnit: e.target.value as 'g' | 'kg' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="g">Grams (g)</option>
                        <option value="kg">Kilograms (kg)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isActive !== false}
                        onChange={(e) =>
                          setEditForm({ ...editForm, isActive: e.target.checked })
                        }
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Active variant
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveEdit}
                        disabled={!editForm.name || !editForm.sku}
                        className="bg-gradient-to-r from-amber-600 to-red-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{variant.name}</h4>
                      <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {variant.sku}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          variant.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {variant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>
                        Price: <span className="font-medium text-gray-900">₹{variant.price}</span>
                        {variant.originalPrice && variant.originalPrice > variant.price && (
                          <span className="ml-2 line-through text-gray-400">
                            ₹{variant.originalPrice}
                          </span>
                        )}
                      </span>
                      <span>
                        Stock: <span className="font-medium text-gray-900">{variant.stock}</span>
                      </span>
                      {variant.weight && (
                        <span>
                          Weight: <span className="font-medium text-gray-900">
                            {variant.weight}{variant.weightUnit || 'g'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(index)}
                    >
                      {variant.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(index)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {editingIndex === null && (
        <Button
          type="button"
          variant="outline"
          onClick={addVariant}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Variant
        </Button>
      )}

      {/* Empty State */}
      {variants.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No variants added yet. Click the button above to add product variants.
        </p>
      )}
    </div>
  );
}
