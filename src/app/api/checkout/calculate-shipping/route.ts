import { NextRequest, NextResponse } from 'next/server';
import { calculateShipping } from '@/lib/shipping/calculateShipping';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { deliveryQuoteRequestSchema, quoteCustomerDelivery } from '@/lib/checkout/delivery-quote';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import { applyRateLimit } from '@/lib/middleware/rateLimit';

/**
 * POST /api/checkout/calculate-shipping
 * Calculate shipping cost based on cart details
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid shipping request.' }, { status: 400 });

    if ('items' in body || 'shippingAddressId' in body) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return NextResponse.json({ error: 'Sign in to estimate delivery.' }, { status: 401 });
      const limited = await applyRateLimit(req, { windowMs: 60000, maxRequests: 40, keyPrefix: 'delivery-quote' });
      if (limited) return limited;
      const parsed = deliveryQuoteRequestSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid cart or address.' }, { status: 400 });
      await connectDB();
      return NextResponse.json(await quoteCustomerDelivery(parsed.data, session.user.id), { headers: { 'Cache-Control': 'no-store' } });
    }

    // Legacy informational estimates remain compatible; checkout uses verified cart/address inputs.
    // Validate input
    if (typeof body.cartTotal !== 'number' || !Number.isFinite(body.cartTotal) || body.cartTotal < 0) {
      return NextResponse.json(
        { error: 'Invalid cart total' },
        { status: 400 }
      );
    }

    if (typeof body.cartWeight !== 'number' || !Number.isFinite(body.cartWeight) || body.cartWeight < 0) {
      return NextResponse.json(
        { error: 'Invalid cart weight' },
        { status: 400 }
      );
    }

    if (!body.postalCode || !/^\d{6}$/.test(body.postalCode)) {
      return NextResponse.json(
        { error: 'Invalid PIN code. Must be 6 digits' },
        { status: 400 }
      );
    }

    // Calculate shipping
    const result = calculateShipping(
      body.cartTotal,
      body.cartWeight,
      body.postalCode
    );

    return NextResponse.json(
      {
        shippingCost: result.tier.cost,
        estimatedDays: result.tier.estimatedDays,
        tier: result.tier.name,
        breakdown: result.breakdown,
      },
      { status: 200 }
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
