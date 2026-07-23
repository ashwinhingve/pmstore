import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import ReturnRequest from '@/models/ReturnRequest';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { createLogger } from '@/lib/utils/logger';

/**
 * POST /api/orders/[orderId]/return
 * Create a return/refund request for an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const logger = createLogger({
    component: 'ReturnRequest',
    endpoint: '/api/orders/[orderId]/return',
  });

  const { orderId } = await params;

  try {
    // Get session
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // orderId can be either MongoDB ObjectId or orderNumber
    const orderNumber = orderId;
    const body = await request.json();
    const { returnType, reason, reasonDetails, items, refundAmount: rawRefundAmount } = body;

    // Validate input
    if (!returnType || !['refund', 'exchange'].includes(returnType)) {
      return NextResponse.json({ error: 'Invalid return type' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'Return reason is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item must be selected' },
        { status: 400 }
      );
    }

    // Find order - ensure it belongs to the user
    const order = await Order.findOne({
      orderNumber,
      userId: session.user.id,
    }).lean() as any;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order is eligible for return
    if (order.orderStatus !== 'delivered') {
      return NextResponse.json(
        { error: 'Only delivered orders can be returned' },
        { status: 400 }
      );
    }

    // Check if return window is still open (7 days from actual delivery)
    const deliveryDate = order.deliveredAt || order.updatedAt || order.createdAt;
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDelivery > 7) {
      return NextResponse.json(
        { error: 'Return window has expired (7 days from delivery)' },
        { status: 400 }
      );
    }

    // Check if there's already a pending return request
    const existingReturn = await ReturnRequest.findOne({
      orderId: order._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingReturn) {
      return NextResponse.json(
        { error: 'A return request for this order is already pending' },
        { status: 400 }
      );
    }

    // Cap refundAmount at the order total — never trust client-supplied value
    const refundAmount = Math.min(
      typeof rawRefundAmount === 'number' && rawRefundAmount > 0 ? rawRefundAmount : order.totalAmount,
      order.totalAmount
    );

    // Create return request
    const returnRequest = await ReturnRequest.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: session.user.id,
      returnType,
      reason,
      reasonDetails,
      items,
      refundAmount,
      status: 'pending',
      pickupAddress: order.shippingAddress,
    });

    logger.info('Return request created', {
      returnRequestId: returnRequest._id.toString(),
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: session.user.id,
      returnType,
      itemsCount: items.length,
      refundAmount,
    });

    // Send notifications (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('shippingAddressId')
          .populate('userId');
        if (!populatedOrder) return;

        const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
        if (phone) {
          smsService.sendReturnRequestSMS(phone, order.orderNumber).catch((err) => {
            console.error('Return request: error sending customer SMS:', err);
          });
        }

        emailService.notifyAdminReturnRequest(populatedOrder, returnRequest).catch((err) => {
          console.error('Return request: error sending admin email:', err);
        });

        const customerName = (populatedOrder.userId as any)?.name || 'Customer';
        smsService.notifyAdminReturnRequest(order.orderNumber, customerName).catch((err) => {
          console.error('Return request: error sending admin SMS:', err);
        });
      } catch (err) {
        console.error('Return request: error sending notifications:', err);
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Return request submitted successfully',
        returnRequest: {
          id: returnRequest._id.toString(),
          orderNumber: returnRequest.orderNumber,
          status: returnRequest.status,
          returnType: returnRequest.returnType,
          refundAmount: returnRequest.refundAmount,
          createdAt: returnRequest.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('Failed to create return request', error, {
      orderNumber: orderId,
    });

    return NextResponse.json(
      { error: 'Failed to submit return request', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[orderId]/return
 * Get return request status for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Get session
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // orderId can be either MongoDB ObjectId or orderNumber
    const orderNumber = orderId;

    // Find order
    const order = await Order.findOne({
      orderNumber,
      userId: session.user.id,
    }).lean() as any;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Find return request
    const returnRequest = await ReturnRequest.findOne({
      orderId: order._id,
    })
      .sort({ createdAt: -1 })
      .lean() as any;

    if (!returnRequest) {
      return NextResponse.json({ error: 'No return request found' }, { status: 404 });
    }

    return NextResponse.json({
      returnRequest: {
        id: returnRequest._id.toString(),
        orderNumber: returnRequest.orderNumber,
        returnType: returnRequest.returnType,
        reason: returnRequest.reason,
        reasonDetails: returnRequest.reasonDetails,
        items: returnRequest.items,
        refundAmount: returnRequest.refundAmount,
        status: returnRequest.status,
        pickupScheduled: returnRequest.pickupScheduled,
        pickupCompleted: returnRequest.pickupCompleted,
        refundProcessed: returnRequest.refundProcessed,
        adminNotes: returnRequest.adminNotes,
        rejectionReason: returnRequest.rejectionReason,
        createdAt: returnRequest.createdAt,
        updatedAt: returnRequest.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch return request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch return request' },
      { status: 500 }
    );
  }
}
