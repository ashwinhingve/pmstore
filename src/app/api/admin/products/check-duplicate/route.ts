import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { duplicateCheckSchema } from '@/lib/validations/duplicate-check';
import { buildCompositionKey, type Salt, type SaltUnit } from '@/lib/pharma/composition';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * Escape regex metacharacters to prevent ReDoS and regex injection attacks.
 * Used when user input is interpolated into MongoDB $regex patterns.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * POST /api/admin/products/check-duplicate
 * Advisory duplicate detection for the product form.
 *
 * Returns up to ~5 active products where:
 * - Always: normalized name matches (case-insensitive)
 * - When manufacturer + salts/form + packSize all present: also checks
 *   the exact-duplicate rule (manufacturer + compositionKey + packSize)
 *
 * Excludes currentProductId so editing a product doesn't warn against itself.
 *
 * Admin only (re-reads role from DB per CLAUDE.md rule 4).
 */
export async function POST(req: Request) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const body = duplicateCheckSchema.parse(await req.json());
    await connectDB();

    // Always normalize name for matching
    const normalizedName = body.name.toLowerCase().trim();

    // Build composition key if all required fields are present
    let compositionKey: string | null = null;
    if (
      body.salts?.length &&
      body.form &&
      body.manufacturer &&
      body.packSize &&
      body.packSize > 0
    ) {
      try {
        // Filter out empty salts and map to the expected shape
        const validSalts = body.salts
          .filter((s) => s.name && s.strength !== undefined && s.unit)
          .map((s) => ({
            name: s.name!,
            strength: s.strength!,
            unit: s.unit! as SaltUnit,
          })) as Salt[];

        if (validSalts.length > 0 && body.form) {
          compositionKey = buildCompositionKey(validSalts, body.form);
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
    let query_final: any;

    if (compositionKey && body.manufacturer && body.packSize) {
      // Full composition available: strict match on all criteria
      query_final = {
        isActive: true,
        name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
        compositionKey,
        manufacturer: { $regex: `^${escapeRegex(body.manufacturer)}$`, $options: 'i' },
        packSize: body.packSize,
      };
    } else {
      // No composition data: match on name only (softer signal)
      query_final = {
        isActive: true,
        name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
      };
    }

    // Exclude the product being edited
    if (body.currentProductId) {
      query_final._id = { $ne: body.currentProductId };
    }

    const matches = await Product.find(query_final)
      .select('_id name manufacturer packSize packUnit compositionKey slug images unitPrice')
      .limit(5)
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
    const results = matches.map((m) => ({
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

    return NextResponse.json({ matches: results });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues ?? error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Error checking duplicates:', error);
    return createErrorResponse(error);
  }
}
