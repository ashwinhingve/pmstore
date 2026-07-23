import { NextRequest, NextResponse } from 'next/server';
import { getAlternatives } from '@/lib/pharma/alternatives-data';
import { createErrorResponse, Errors } from '@/lib/utils/errorHandler';

/**
 * GET /api/products/[slug]/alternatives
 * The Strip's data source — every product sharing this composition, ranked.
 * See docs/02-API-CONTRACT.md.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const strip = await getAlternatives(slug);
    if (!strip) throw Errors.notFound('Product', slug);
    return NextResponse.json({ data: strip });
  } catch (err) {
    return createErrorResponse(err);
  }
}
