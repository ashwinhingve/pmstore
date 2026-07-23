import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createShipmentForOrder } from '@/lib/shipping/createShipmentForOrder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, provider = 'delhivery' } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!['delhivery', 'shiprocket'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "delhivery" or "shiprocket"' },
        { status: 400 }
      );
    }

    // Allow internal server-to-server calls via shared secret header
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternal = internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

    if (!isInternal) {
      const session = await getServerSession(authOptions);
      if (!session || session.user?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const result = await createShipmentForOrder(orderId, provider as 'delhivery' | 'shiprocket');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Shipment created successfully',
        waybill: result.waybill,
        trackingUrl: result.trackingUrl,
      });
    } else {
      // Use 422 for provider-side failures (serviceability, bad pincode, etc.)
      // so the client gets a readable message rather than a generic 500
      return NextResponse.json(
        { error: result.error || 'Failed to create shipment' },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create shipment',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
