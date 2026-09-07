/**
 * Shared duplicate-detection logic for admin operations.
 * Used by both the check-duplicate route and the bulk import validate mode.
 */

import Product from '@/models/Product';
import { buildCompositionKey, type Salt, type SaltUnit, type DosageForm } from '@/lib/pharma/composition';

/**
 * Escape regex metacharacters to prevent ReDoS and regex injection attacks.
 * Used when user input is interpolated into MongoDB $regex patterns.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface DuplicateMatch {
  _id: string;
  name: string;
  manufacturer: string;
  packSize: number;
  packUnit: string;
  compositionKey: string;
  slug: string;
  images: Array<{ url: string }>;
  unitPrice: number;
}

export interface FindDuplicatesOptions {
  name: string;
  salts?: Array<{ name?: string; strength?: number; unit?: string }>;
  form?: string;
  manufacturer?: string;
  packSize?: number;
  currentProductId?: string;
  limit?: number;
}

/**
 * Find duplicate products matching on name and/or composition.
 *
 * Returns up to `limit` active products where:
 * - Always: normalized name matches (case-insensitive)
 * - When manufacturer + salts/form + packSize all present: also checks
 *   the exact-duplicate rule (manufacturer + compositionKey + packSize)
 *
 * Excludes currentProductId so editing a product doesn't warn against itself.
 */
export async function findDuplicateProducts(
  options: FindDuplicatesOptions
): Promise<DuplicateMatch[]> {
  const { name, salts, form, manufacturer, packSize, currentProductId, limit = 5 } = options;
  const normalizedName = name.toLowerCase().trim();

  // Build composition key if all required fields are present
  let compositionKey: string | null = null;
  if (
    salts?.length &&
    form &&
    manufacturer &&
    packSize &&
    packSize > 0
  ) {
    try {
      // Filter out empty salts and map to the expected shape
      const validSalts = salts
        .filter((s): s is { name: string; strength: number; unit: string } =>
          s.name != null && s.strength != null && s.unit != null
        )
        .map((s) => ({
          name: s.name,
          strength: s.strength,
          unit: s.unit as SaltUnit,
        })) as Salt[];

      if (validSalts.length > 0 && form) {
        compositionKey = buildCompositionKey(validSalts, form as DosageForm);
      }
    } catch (err) {
      // If composition key building fails, silently fall back to name-only matching
      // This is advisory, so we don't want to block the form on a composition error
      console.warn('Failed to build composition key for duplicate check:', err);
    }
  }

  // Build the query for duplicates:
  // - If composition data provided: return products matching on BOTH name AND composition
  // - If composition data missing: return products matching on name only
  type QueryFilter = Record<string, unknown>;
  let query_final: QueryFilter;

  if (compositionKey && manufacturer && packSize) {
    // Full composition available: strict match on all criteria
    query_final = {
      isActive: true,
      name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
      compositionKey,
      manufacturer: { $regex: `^${escapeRegex(manufacturer)}$`, $options: 'i' },
      packSize: packSize,
    };
  } else {
    // No composition data: match on name only (softer signal)
    query_final = {
      isActive: true,
      name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
    };
  }

  // Exclude the product being edited
  if (currentProductId) {
    query_final._id = { $ne: currentProductId };
  }

  const matches = await Product.find(query_final as any)
    .select('_id name manufacturer packSize packUnit compositionKey slug images unitPrice')
    .limit(limit)
    .lean<
      Array<{
        _id: string;
        name: string;
        manufacturer: string;
        packSize: number;
        packUnit: string;
        compositionKey: string;
        slug: string;
        images: Array<{ url: string }>;
        unitPrice: number;
      }>
    >();

  // Serialize _id to string
  return matches.map((m) => ({
    _id: String(m._id),
    name: m.name,
    manufacturer: m.manufacturer,
    packSize: m.packSize,
    packUnit: m.packUnit,
    compositionKey: m.compositionKey,
    slug: m.slug,
    images: m.images || [],
    unitPrice: m.unitPrice,
  }));
}
