import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

const LIST_RATE_LIMIT = { windowMs: 60_000, maxRequests: 90, keyPrefix: 'v1:products' };

// Card fields the app needs — lead with unitPrice, the headline comparison
// number (CLAUDE.md rule #1). Keep the payload lean for mobile data.
const CARD_FIELDS =
  'name slug manufacturer form salts price mrp packSize packUnit unitPrice stock prescriptionRequired scheduleClass compositionKey images averageRating totalReviews';

/**
 * GET /api/v1/products — the mobile product listing. Active, in-catalogue
 * products, paginated. Public. For search/filtering the app uses /api/v1/search.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, LIST_RATE_LIMIT);
  if (limited) return limited;

  try {
    await connectDB();
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));

    const query: Record<string, unknown> = { isActive: true, isDiscontinued: false };
    const category = url.searchParams.get('category');
    if (category && /^[a-f\d]{24}$/i.test(category)) query.category = category;

    const [products, total] = await Promise.all([
      Product.find(query)
        .select(CARD_FIELDS)
        .sort({ orderCount: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Array<{ _id: unknown; category?: unknown }>>(),
      Product.countDocuments(query),
    ]);

    const data = products.map((p) => ({
      ...p,
      _id: String(p._id),
      ...(p.category ? { category: String(p.category) } : {}),
    }));

    return v1Ok({ products: data, meta: { page, limit, total } });
  } catch {
    return v1Error('Products are unavailable right now.', 503, 'PRODUCTS_UNAVAILABLE');
  }
}
