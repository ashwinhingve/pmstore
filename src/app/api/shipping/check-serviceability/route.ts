import { NextRequest, NextResponse } from 'next/server';
import { delhiveryService } from '@/lib/shipping/delhivery';
import { isManualDeliveryPincode } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    // Get PIN code from query params
    const searchParams = request.nextUrl.searchParams;
    const pincode = searchParams.get('pincode');

    if (!pincode) {
      return NextResponse.json(
        { error: 'PIN code is required' },
        { status: 400 }
      );
    }

    // Validate PIN code format (6 digits)
    const cleanPincode = pincode.replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid PIN code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Local hand-delivery zone: the store delivers these itself. Never ask the
    // courier (it may report the shop's own pincode as non-serviceable).
    if (isManualDeliveryPincode(cleanPincode)) {
      return NextResponse.json({
        serviceable: true,
        manualDelivery: true,
        estimatedDays: 1,
        pincode: cleanPincode,
      });
    }

    // Check serviceability with Delhivery
    const result = await delhiveryService.checkServiceability(cleanPincode);

    if (result.error) {
      return NextResponse.json(
        {
          serviceable: false,
          error: result.error,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      serviceable: result.serviceable,
      estimatedDays: result.estimatedDays,
      pincode: cleanPincode,
    });
  } catch (error: any) {
    console.error('Error checking serviceability:', error);
    return NextResponse.json(
      {
        serviceable: false,
        error: error.message || 'Failed to check serviceability',
      },
      { status: 500 }
    );
  }
}
