import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import Order from '@/models/Order';
import { getShippingProvider } from '@/lib/shipping/providerFactory';

export async function GET(request: NextRequest) {
  try {
    // 1. Get waybill from query params
    const searchParams = request.nextUrl.searchParams;
    const waybill = searchParams.get('waybill');

    if (!waybill) {
      return NextResponse.json(
        { error: 'Waybill number is required' },
        { status: 400 }
      );
    }

    // 2. Connect to database
    await connectDB();

    // 3. Find shipment in database
    const shipment = await Shipment.findOne({ waybill }).populate('orderId');

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // 4. Fetch latest tracking data from the appropriate provider
    const provider = (shipment as any).provider || 'delhivery';
    const identifier = (shipment as any).providerShipmentId || shipment.waybill;
    const shippingService = getShippingProvider(provider);
    const trackingData = await shippingService.trackShipment(identifier);

    if (!trackingData) {
      // Return existing data if Delhivery API fails
      return NextResponse.json({
        success: true,
        tracking: {
          waybill: shipment.waybill,
          status: shipment.shipmentStatus,
          currentLocation: shipment.currentLocation,
          scans: shipment.scans,
        },
      });
    }

    // 5. Update shipment with latest data
    shipment.shipmentStatus = trackingData.status;
    shipment.currentLocation = trackingData.currentLocation;

    // Add new scans (avoid duplicates)
    if (trackingData.scans && trackingData.scans.length > 0) {
      trackingData.scans.forEach((scan) => {
        const existingScan = shipment.scans.find(
          (s: any) =>
            new Date(s.timestamp).getTime() === new Date(scan.timestamp).getTime() &&
            s.status === scan.activity
        );

        if (!existingScan) {
          shipment.scans.push({
            status: scan.activity,
            location: scan.location,
            timestamp: new Date(scan.timestamp),
            remarks: scan.status,
          });
        }
      });

      // Sort scans by timestamp (newest first)
      shipment.scans.sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // Set delivery date if delivered
    if (trackingData.mappedStatus === 'delivered' && !shipment.deliveryDate) {
      shipment.deliveryDate = new Date();
    }

    await shipment.save();

    // 6. Update order status based on shipment status (via internal secret or skip)
    // Status mutations are handled authoritatively by the webhook/poll-tracking cron.
    // This read-only tracking endpoint should not mutate state for unauthenticated callers.
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternal = internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;
    if (isInternal) {
      const order = await Order.findById(shipment.orderId);
      if (order) {
        const newOrderStatus = shippingService.mapStatus(trackingData.status);
        if (order.orderStatus !== newOrderStatus) {
          order.orderStatus = newOrderStatus;
          order.lastStatusUpdate = new Date();
          if (newOrderStatus === 'delivered') order.deliveredAt = new Date();
          await order.save();
        }
      }
    }

    // 7. Return tracking data
    return NextResponse.json({
      success: true,
      tracking: {
        waybill: shipment.waybill,
        status: shipment.shipmentStatus,
        currentLocation: shipment.currentLocation,
        estimatedDelivery: trackingData.expectedDelivery,
        deliveryDate: shipment.deliveryDate,
        scans: shipment.scans,
      },
    });
  } catch (error: any) {
    console.error('Error tracking shipment:', error);
    return NextResponse.json(
      {
        error: 'Failed to track shipment',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
