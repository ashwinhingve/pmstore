import { NextRequest, NextResponse } from 'next/server';
import { calculateShipping } from '@/lib/shipping/calculateShipping';

/**
 * POST /api/checkout/calculate-shipping
 * Calculate shipping cost based on cart details
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    if (typeof body.cartTotal !== 'number' || body.cartTotal < 0) {
      return NextResponse.json(
        { error: 'Invalid cart total' },
        { status: 400 }
      );
    }

    if (typeof body.cartWeight !== 'number' || body.cartWeight < 0) {
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
    console.error('❌ Calculate shipping error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}
