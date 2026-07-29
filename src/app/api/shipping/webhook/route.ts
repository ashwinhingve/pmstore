import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import Order from '@/models/Order';
import { delhiveryService } from '@/lib/shipping/delhivery';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { delhiveryWebhookSchema } from '@/lib/validations/shipping';
import { createErrorResponse, Errors, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * Verify webhook signature using HMAC with replay attack prevention
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET;

  // Enforce webhook secret in production
  if (process.env.NODE_ENV === 'production' && !webhookSecret) {
    throw new Error('DELHIVERY_WEBHOOK_SECRET is required in production');
  }

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      // Already thrown above for production
      return false;
    }
    console.warn('SECURITY WARNING: DELHIVERY_WEBHOOK_SECRET not configured. Accepting webhook in development.');
    return true; // Accept in development without verification
  }

  // Replay attack prevention: validate timestamp (5-minute window)
  if (timestamp) {
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    const timeDifference = Math.abs(currentTime - requestTime);

    if (timeDifference > 300000) { // 5 minutes in milliseconds
      console.error('Webhook rejected: timestamp outside valid window', {
        requestTime: new Date(requestTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        differenceMs: timeDifference
      });
      return false;
    }
  }

  // Generate expected signature
  const hmac = createHmac('sha256', webhookSecret);
  const signaturePayload = timestamp ? `${payload}.${timestamp}` : payload;
  const digest = hmac.update(signaturePayload).digest('hex');

  // Use constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    // Signature length mismatch or invalid format
    console.error('Webhook signature format error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Apply rate limiting (100 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, RateLimitPresets.SHIPPING_WEBHOOK);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 2. Get raw body, signature, and timestamp
    const body = await request.text();
    const signature = request.headers.get('x-delhivery-signature') || '';
    const timestamp = request.headers.get('x-delhivery-timestamp') || '';
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // 2. Verify webhook signature with timestamp
    if (!verifyWebhookSignature(body, signature, timestamp)) {
      // Log failed verification attempt with details
      console.error('Webhook signature verification failed', {
        ip: clientIp,
        timestamp: new Date().toISOString(),
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        payloadHash: createHmac('sha256', 'log').update(body).digest('hex').substring(0, 16)
      });

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Parse and validate webhook payload
    const webhookData = JSON.parse(body);

    // Validate webhook payload using Zod schema
    const validationResult = delhiveryWebhookSchema.safeParse(webhookData);

    if (!validationResult.success) {
      console.error('Invalid webhook payload:', validationResult.error.issues);
      return createErrorResponse(
        Errors.validationError('Invalid webhook payload', validationResult.error.issues),
        400
      );
    }

    const { waybill, status, location, timestamp: webhookTimestamp, scan_type, instructions } =
      validationResult.data;

    // Log only the tracking-scan fields — never the raw payload (CLAUDE.md rule #6).
    console.log('Delhivery webhook received:', { waybill, status, scan_type });

    // 4. Connect to database
    await connectDB();

    // 5. Find shipment by waybill
    const shipment = await Shipment.findOne({ waybill });

    if (!shipment) {
      console.warn('Shipment not found for waybill:', waybill);
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // 6. Update shipment status and add scan
    const previousStatus = shipment.shipmentStatus;
    shipment.shipmentStatus = status || shipment.shipmentStatus;
    shipment.currentLocation = location || shipment.currentLocation;

    // Add scan to history
    shipment.scans.push({
      status: status || 'Status Update',
      location: location || 'Unknown',
      timestamp: webhookTimestamp ? new Date(webhookTimestamp) : new Date(),
      remarks: instructions || scan_type || '',
    });

    // Set delivery date if delivered
    if (status === 'Delivered' && !shipment.deliveryDate) {
      shipment.deliveryDate = new Date();
    }

    await shipment.save();

    // 7. Update order status
    const order = await Order.findById(shipment.orderId)
      .populate('shippingAddressId')
      .populate('userId');

    if (order) {
      const newOrderStatus = delhiveryService.mapStatus(status);
      const previousOrderStatus = order.orderStatus;

      if (order.orderStatus !== newOrderStatus) {
        order.orderStatus = newOrderStatus as any;
        order.lastStatusUpdate = new Date();

        if (newOrderStatus === 'delivered') {
          order.deliveredAt = new Date();
        }

        await order.save();

        // 8. Send notifications for status changes (non-blocking)
        try {
          const customerName = (order.userId as any)?.name || 'Customer';
          const customerEmail = (order.userId as any)?.email || '';

          // Send delivery confirmation + feedback request
          if (newOrderStatus === 'delivered') {
            emailService.sendOrderDelivered(order).catch((error) => {
              console.error('Error sending delivery email:', error);
            });

            emailService.sendDeliveryFeedbackRequest(order).catch((error) => {
              console.error('Error sending feedback request email:', error);
            });

            const phone = (order.shippingAddressId as any)?.phoneNumber;
            if (phone) {
              smsService.sendDeliverySMS(phone, order.orderNumber).catch((error) => {
                console.error('Error sending delivery SMS:', error);
              });

              const reviewUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''}/orders`;
              smsService.sendFeedbackRequestSMS(phone, order.orderNumber, reviewUrl).catch((error) => {
                console.error('Error sending feedback request SMS:', error);
              });
            }

            emailService.notifyAdminOrderDelivered({ orderNumber: order.orderNumber, customerName, customerEmail }).catch((error) => {
              console.error('Error sending admin delivery email:', error);
            });
            smsService.notifyAdminOrderDelivered(order.orderNumber, customerName).catch((error) => {
              console.error('Error sending admin delivery SMS:', error);
            });
          }

          // Send out for delivery notification
          else if (status === 'Out for Delivery') {
            const phone = (order.shippingAddressId as any)?.phoneNumber;
            if (phone) {
              smsService
                .sendOutForDeliverySMS(phone, order.orderNumber)
                .catch((error) => {
                  console.error('Error sending out for delivery SMS:', error);
                });
            }
            smsService.notifyAdminOutForDelivery(order.orderNumber, customerName).catch((error) => {
              console.error('Error sending admin out-for-delivery SMS:', error);
            });
          }
        } catch (error) {
          console.error('Error sending webhook notifications:', error);
        }
      }
    }

    // 9. Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
