'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

interface DuplicateMatch {
  _id: string;
  name: string;
  manufacturer: string;
  packSize: number;
  packUnit: string;
  slug: string;
  images: Array<{ url: string }>;
  unitPrice: number;
}

interface DuplicateWarningProps {
  matches: DuplicateMatch[];
}

/**
 * Advisory card: "A similar product may already exist"
 * Non-modal, never disables Save, just alerts the admin to potential duplicates.
 */
export function DuplicateWarning({ matches }: DuplicateWarningProps) {
  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border border-[var(--foil-soft)] rounded-[var(--radius-md)] bg-[var(--paper-card)] shadow-[0_1px_3px_var(--shadow-sm)]">
      <div className="flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-[var(--ink-70)] flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--ink)]">
            A similar product may already exist
          </p>
          <p className="text-xs text-[var(--ink-70)] mt-1">
            Review the {matches.length > 1 ? 'products below' : 'product below'} before saving. Duplicates are advisory only — you can still save this product.
          </p>

          {/* Matches list */}
          <div className="mt-3 space-y-2">
            {matches.map((match) => (
              <div
                key={match._id}
                className="flex gap-3 p-2 bg-[var(--paper)] rounded-[var(--radius-sm)] hover:bg-[var(--foil-soft)] transition-colors"
              >
                {/* Thumbnail */}
                {match.images && match.images.length > 0 && (
                  <div className="w-10 h-10 flex-shrink-0 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--foil-soft)]">
                    <img
                      src={match.images[0].url}
                      alt={match.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)] truncate">
                    {match.name}
                  </p>
                  <p className="text-xs text-[var(--ink-70)] truncate">
                    {match.manufacturer}
                    {match.packSize > 0 && ` • ${match.packSize} ${match.packUnit}`}
                  </p>
                  {match.unitPrice > 0 && (
                    <p className="price text-xs text-[var(--ink-70)]">
                      ₹{match.unitPrice.toFixed(2)}/unit
                    </p>
                  )}
                </div>

                {/* Link to existing product */}
                <Link
                  href={`/admin/products/${match._id}`}
                  className="text-xs font-medium text-[var(--brand)] hover:underline whitespace-nowrap flex-shrink-0 py-1 px-2 hover:bg-[var(--paper-card)] rounded-[var(--radius-sm)]"
                  aria-label={`View ${match.name}`}
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
