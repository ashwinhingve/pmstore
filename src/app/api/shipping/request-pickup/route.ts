import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { requestPickupForOrder } from '@/lib/shipping/requestPickupForOrder';
import { requestPickupSchema } from '@/lib/validations/shipping';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const parsed = requestPickupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }
    const { orderId, pickupDate } = parsed.data;

    // Allow internal server-to-server calls via shared secret header (parity with
    // /api/shipping/create); otherwise require a DB-verified admin (CLAUDE.md rule #4).
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternal = internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

    if (!isInternal) {
      const adminCheck = await verifyAdminAccess();
      if (adminCheck.error) return adminCheck.error;
    }

    const result = await requestPickupForOrder(orderId, pickupDate);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.reused
          ? 'Pickup already scheduled for today — this order is covered'
          : 'Pickup requested',
        pickupId: result.pickupId,
        scheduledDate: result.scheduledDate,
      });
    }

    // 422 for provider-side / precondition failures so the client gets a readable
    // message rather than a generic 500.
    return NextResponse.json(
      { error: result.error || 'Failed to request pickup' },
      { status: 422 }
    );
  } catch (error: any) {
    console.error('Error requesting pickup:', error);
    return NextResponse.json(
      { error: 'Failed to request pickup', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
