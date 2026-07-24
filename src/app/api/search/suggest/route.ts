import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { searchSuggestSchema } from '@/lib/validations/search';
import { executeSuggest } from '@/lib/search/execute';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

// Fires on every keystroke, so the ceiling is higher than full search but still
// bounded per IP to keep autocomplete from being used as a scraping firehose.
const SUGGEST_RATE_LIMIT = { windowMs: 60_000, maxRequests: 120, keyPrefix: 'search:suggest' };

/**
 * GET /api/search/suggest
 * Autocomplete — up to 8 results, target under 150 ms warm. Kept deliberately
 * thin. See docs/02-API-CONTRACT.md.
 */
export async function GET(req: NextRequest) {
  try {
    const limited = await applyRateLimit(req, SUGGEST_RATE_LIMIT);
    if (limited) return limited;

    await connectDB();

    const parsed = searchSuggestSchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) {
      throw Errors.validationError('Check your search and try again', parsed.error.flatten());
    }

    const result = await executeSuggest(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return createErrorResponse(err);
  }
}
