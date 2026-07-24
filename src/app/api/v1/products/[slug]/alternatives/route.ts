import { NextRequest } from 'next/server';
import { getAlternatives } from '@/lib/pharma/alternatives-data';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

/**
 * GET /api/v1/products/[slug]/alternatives — the Strip. public.
 * Ranked alternatives for the same composition.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const strip = await getAlternatives(slug);

    if (!strip) {
      return v1Error('Product not found', 404, 'NOT_FOUND');
    }

    return v1Ok(strip);
  } catch (err) {
    console.error('v1 alternatives error:', err);
    return v1Error('Alternatives unavailable', 503, 'UNAVAILABLE');
  }
}
