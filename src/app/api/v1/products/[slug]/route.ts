import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

// Full product card with images and composition for detail view
const DETAIL_FIELDS =
  'name slug manufacturer form salts price mrp packSize packUnit unitPrice stock prescriptionRequired scheduleClass compositionKey images description longDescription storageInstructions usageInstructions sideEffects contraindications averageRating totalReviews hsnCode gstRate';

/**
 * GET /api/v1/products/[slug] — full product detail. public.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    const product = await Product.findOne({ slug, isActive: true })
      .select(DETAIL_FIELDS)
      .lean<{ _id: unknown } | null>();

    if (!product) {
      return v1Error('Product not found', 404, 'NOT_FOUND');
    }

    const data = {
      ...product,
      _id: String(product._id),
    };

    return v1Ok({ product: data });
  } catch (err) {
    console.error('v1 product detail error:', err);
    return v1Error('Product unavailable', 503, 'UNAVAILABLE');
  }
}
