import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import SavedMedicine from '@/models/SavedMedicine';
import Product from '@/models/Product';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { saveMedicineSchema } from '@/lib/validations/saved';

export const runtime = 'nodejs';

const PRODUCT_FIELDS = 'name slug price mrp unitPrice packSize packUnit images stock prescriptionRequired scheduleClass';

/**
 * GET /api/v1/saved-medicines — list user's saved medicines.
 * Bearer auth required. Newest first.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;

    const saved = await SavedMedicine.find({ userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'productId', select: PRODUCT_FIELDS })
      .lean<{ _id: unknown; createdAt: Date; productId: Record<string, unknown> | null }[]>();

    const data = saved
      .filter((s) => s.productId) // Skip if product was deleted
      .map((s) => ({
        _id: String(s._id),
        savedAt: s.createdAt,
        product: {
          ...(s.productId || {}),
          _id: String((s.productId as any)?._id),
        },
      }));

    return v1Ok({ medicines: data });
  } catch (err) {
    console.error('v1 saved medicines list error:', err);
    return v1Error('Could not fetch saved medicines', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/v1/saved-medicines — save a medicine.
 * Bearer auth required. Idempotent (unique on user+product).
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const body = await req.json();
    const parsed = saveMedicineSchema.safeParse(body);

    if (!parsed.success) {
      return v1Error('Invalid product', 400, 'VALIDATION_ERROR');
    }

    const { productId } = parsed.data;

    // Verify product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return v1Error('Product not found', 404, 'NOT_FOUND');
    }

    // Save (upsert)
    await SavedMedicine.updateOne(
      { userId, productId },
      { $setOnInsert: { userId, productId } },
      { upsert: true }
    );

    return v1Ok({ productId, saved: true }, 201);
  } catch (err) {
    console.error('v1 save medicine error:', err);
    return v1Error('Could not save medicine', 500, 'INTERNAL_ERROR');
  }
}
