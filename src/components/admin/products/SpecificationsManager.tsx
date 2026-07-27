'use client';

import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductSpecificationData } from '@/lib/validations/product';

interface SpecificationsManagerProps {
  specifications: ProductSpecificationData[];
  onChange: (specifications: ProductSpecificationData[]) => void;
}

const COMMON_SPECS = [
  'Ingredients',
  'Weight',
  'Shelf Life',
  'Origin',
  'Brand',
  'Manufacturer',
  'Certifications',
  'Storage Instructions',
  'Nutritional Info',
  'Allergen Info',
];

export default function SpecificationsManager({
  specifications,
  onChange,
}: SpecificationsManagerProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addSpecification = (key: string = '', value: string = '') => {
    const newSpec: ProductSpecificationData = {
      key,
      value,
      order: specifications.length,
    };
    onChange([...specifications, newSpec]);
    setShowSuggestions(false);
  };

  const updateSpecification = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const updated = specifications.map((spec, i) =>
      i === index ? { ...spec, [field]: value } : spec
    );
    onChange(updated);
  };

  const removeSpecification = (index: number) => {
    const updated = specifications.filter((_, i) => i !== index);
    // Update order
    const reordered = updated.map((spec, i) => ({ ...spec, order: i }));
    onChange(reordered);
  };

  const moveSpecification = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= specifications.length) return;

    const updated = [...specifications];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    // Update order
    const reordered = updated.map((spec, i) => ({ ...spec, order: i }));
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Existing Specifications */}
      {specifications.length > 0 && (
        <div className="space-y-3">
          {specifications.map((spec, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-[var(--foil-soft)] rounded-lg border border-[var(--foil-soft)]"
            >
              {/* Drag Handle */}
              <div className="flex flex-col gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => moveSpecification(index, 'up')}
                  disabled={index === 0}
                  className="text-[var(--ink-40)] hover:text-[var(--ink-70)] disabled:opacity-30"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSpecification(index, 'down')}
                  disabled={index === specifications.length - 1}
                  className="text-[var(--ink-40)] hover:text-[var(--ink-70)] disabled:opacity-30"
                >
                  <GripVertical className="w-4 h-4 rotate-180" />
                </button>
              </div>

              {/* Key Input */}
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Specification name (e.g., Ingredients)"
                  value={spec.key}
                  onChange={(e) =>
                    updateSpecification(index, 'key', e.target.value)
                  }
                  className="mb-2"
                />
                <Input
                  type="text"
                  placeholder="Value (e.g., 100% Organic Chia Seeds)"
                  value={spec.value}
                  onChange={(e) =>
                    updateSpecification(index, 'value', e.target.value)
                  }
                />
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeSpecification(index)}
                className="text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-[var(--foil-soft)] mt-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Specification
        </Button>

        {/* Common Specifications Dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 mt-2 w-full bg-[var(--paper-card)] border border-[var(--foil-soft)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <p className="text-xs text-[var(--ink-40)] font-medium mb-2 px-2">
                Common Specifications
              </p>
              {COMMON_SPECS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => addSpecification(spec, '')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--foil-soft)] rounded transition-colors"
                >
                  {spec}
                </button>
              ))}
              <div className="border-t border-[var(--foil-soft)] mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => addSpecification('', '')}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--brand)] hover:bg-[var(--brand-soft)] rounded transition-colors font-medium"
                >
                  + Custom Specification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {specifications.length === 0 && (
        <p className="text-sm text-[var(--ink-40)] text-center py-4">
          No specifications added yet. Click the button above to add product specifications.
        </p>
      )}
    </div>
  );
}
