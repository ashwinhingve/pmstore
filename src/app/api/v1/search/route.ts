import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { searchQuerySchema } from '@/lib/validations/search';
import { executeSearch } from '@/lib/search/execute';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

const SEARCH_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60, keyPrefix: 'v1:search' };

/**
 * GET /api/v1/search — the mobile mirror of /api/search. Reuses the same
 * executeSearch so web and app return identical results; only the envelope
 * differs (apiVersion:1). Public, no bearer required.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, SEARCH_RATE_LIMIT);
  if (limited) return limited;

  try {
    await connectDB();
    const parsed = searchQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return v1Error('Check your search and try again.', 400, 'INVALID_QUERY');

    const result = await executeSearch(parsed.data);
    return v1Ok(result);
  } catch {
    return v1Error('Search is unavailable right now.', 503, 'SEARCH_UNAVAILABLE');
  }
}
