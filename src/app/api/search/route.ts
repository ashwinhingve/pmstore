import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { searchQuerySchema } from '@/lib/validations/search';
import { executeSearch } from '@/lib/search/execute';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

// Public + unauthenticated + hits Atlas on every call — the obvious abuse
// target, so cap it per IP. Generous enough for real typing-as-you-search.
const SEARCH_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60, keyPrefix: 'search:full' };

/**
 * GET /api/search
 * Full search results with facets (category, prescriptionRequired, price band).
 * Public. Atlas Search primary, `$text` fallback. See docs/02-API-CONTRACT.md.
 */
export async function GET(req: NextRequest) {
  try {
    const limited = await applyRateLimit(req, SEARCH_RATE_LIMIT);
    if (limited) return limited;

    await connectDB();

    const parsed = searchQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) {
      throw Errors.validationError('Check your search and try again', parsed.error.flatten());
    }

    const result = await executeSearch(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return createErrorResponse(err);
  }
}
