import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import { cashfreeService } from '@/lib/payment/cashfree';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { whatsappService } from '@/lib/notifications/whatsapp';
import { createShipmentForOrder } from '@/lib/shipping/createShipmentForOrder';
import Discount from '@/models/Discount';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { generatePaymentIdempotencyKey, idempotencyService } from '@/lib/utils/idempotency';
import { createRequestLogger, LogMessages, MetricNames } from '@/lib/utils/logger';
import { buildStockDecrement } from '@/lib/checkout/stock';

// Cashfree redirects here via GET with ?order_id=xxx after payment
export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request, { component: 'PaymentCallback' });
  logger.startTimer();

  try {
    const rateLimitResponse = await applyRateLimit(request, RateLimitPresets.PAYMENT_CALLBACK);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Extract order_id from query params (Cashfree adds this to the return_url)
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('order_id');

    if (!orderNumber) {
      return new NextResponse(
        generateErrorHTML('Invalid Request', 'No order ID provided in callback'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    logger.info(LogMessages.PAYMENT_CALLBACK_RECEIVED, { orderNumber });

    // Verify payment with Cashfree API
    const verificationResult = await cashfreeService.verifyPayment(orderNumber);

    logger.info('Cashfree verification result', {
      orderNumber,
      status: verificationResult.status,
      success: verificationResult.success,
      transactionId: verificationResult.transactionId,
    });

    // Idempotency check
    const idempotencyKey = generatePaymentIdempotencyKey(
      orderNumber,
      verificationResult.transactionId || ''
    );

    const alreadyProcessed = await idempotencyService.exists(idempotencyKey);

    if (alreadyProcessed) {
      logger.warn('Duplicate payment callback detected', {
        orderNumber,
        transactionId: verificationResult.transactionId,
        idempotencyKey,
      });

      await connectDB();
      const order = await Order.findOne({ orderNumber });

      if (order && order.paymentStatus === 'paid') {
        return new NextResponse(
          generateSuccessHTML(order._id.toString(), orderNumber),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'X-Idempotency-Cache-Hit': 'true',
            },
          }
        );
      }
    }

    // Connect to database
    await connectDB();

    // Find order by order number
    const order = await Order.findOne({ orderNumber }).populate('shippingAddressId');

    if (!order) {
      console.error('Order not found:', orderNumber);
      return new NextResponse(
        generateErrorHTML('Order Not Found', `Order ${orderNumber} not found`),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Find transaction
    let transaction = await Transaction.findOne({
      gatewayOrderId: orderNumber,
    });

    if (!transaction) {
      console.error('Transaction not found for order:', orderNumber);
      return new NextResponse(
        generateErrorHTML('Transaction Not Found', 'Payment record not found'),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Validate amount matches (use numeric comparison to avoid floating-point string issues)
    if (Math.abs(order.totalAmount - (verificationResult.amount || 0)) > 0.01) {
      console.error('Amount mismatch:', {
        orderAmount: order.totalAmount,
        paidAmount: verificationResult.amount,
      });
      transaction.status = 'failed';
      transaction.gatewayResponse = {
        ...verificationResult.gatewayResponse,
        error: 'Amount mismatch',
      };
      await transaction.save();

      return new NextResponse(
        generateErrorHTML('Payment Failed', 'Amount verification failed'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Handle payment success
    if (verificationResult.success) {
      // Prevent duplicate processing
      if (order.paymentStatus === 'paid') {
        return new NextResponse(
          generateSuccessHTML(order._id.toString(), orderNumber),
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      }

      // Use MongoDB transaction for atomic operations
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        logger.info('Starting atomic payment processing', {
          orderNumber,
          transactionId: verificationResult.transactionId,
          amount: verificationResult.amount,
        });

        const paymentMethod = cashfreeService.getPaymentMethod(
          verificationResult.paymentMethod || ''
        );

        // Update transaction
        transaction.status = 'success';
        transaction.transactionId = verificationResult.transactionId || '';
        transaction.paymentMethod = paymentMethod;
        transaction.gatewayResponse = verificationResult.gatewayResponse;
        await transaction.save({ session });

        // Update order
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        order.paymentId = verificationResult.transactionId;
        order.transactionId = verificationResult.transactionId;
        order.paymentMethod = paymentMethod;
        order.lastStatusUpdate = new Date();
        await order.save({ session });

        // Reduce product stock atomically
        const orderItems = await OrderItem.find({ orderId: order._id }).session(session);

        for (const item of orderItems) {
          // Decrement stock and bump orderCount atomically; a null result means
          // a concurrent order took the last unit, which aborts the transaction.
          const { filter, update } = buildStockDecrement(item);
          const updatedProduct = await Product.findOneAndUpdate(filter, update, {
            new: true,
            session,
          });

          if (!updatedProduct) {
            const currentProduct = await Product.findById(item.productId).session(session);

            logger.error('Insufficient stock during payment processing', null, {
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId,
              required: item.quantity,
              available: currentProduct?.stock || 0,
            });

            throw new Error(
              `Insufficient stock for ${item.productName}. Available: ${currentProduct?.stock || 0}, Required: ${item.quantity}`
            );
          }

          logger.debug('Stock reduced successfully', {
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            quantity: item.quantity,
          });
        }

        // Commit the transaction
        await session.commitTransaction();
        logger.info(LogMessages.PAYMENT_SUCCESS, {
          orderNumber,
          transactionId: verificationResult.transactionId,
          orderId: order._id,
        });

        // Store idempotency key
        await idempotencyService.executeOnce(
          idempotencyKey,
          async () => ({
            response: { success: true, orderNumber, orderId: order._id.toString() },
            statusCode: 200,
          }),
          86400000
        );
      } catch (error: any) {
        await session.abortTransaction();
        logger.error('Payment processing transaction failed, rolled back', error, {
          orderNumber,
          transactionId: verificationResult.transactionId,
        });
        throw error;
      } finally {
        session.endSession();
      }

      // Increment discount usage for online payments
      if (order.discountId) {
        Discount.findByIdAndUpdate(order.discountId, { $inc: { totalUsed: 1 } }).catch(() => {});
      }

      // Create shipment — sendNotifications:true so shipment tracking SMS/email fires.
      // Order confirmation is a separate message sent below.
      try {
        const shipmentResult = await createShipmentForOrder(order._id.toString(), 'delhivery', true);
        if (shipmentResult.success) {
          console.log('Shipment created for order:', orderNumber, 'waybill:', shipmentResult.waybill);
        } else {
          console.error('Shipment creation failed for order:', orderNumber, shipmentResult.error);
        }
      } catch (error) {
        console.error('Failed to create shipment:', error);
        // Don't fail payment if shipment creation fails
      }

      // Send customer notifications immediately (non-blocking, highest priority)
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('shippingAddressId')
          .populate('userId');

        emailService.sendOrderConfirmation(populatedOrder).catch((error) => {
          console.error('Error sending order confirmation email:', error);
        });

        const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
        if (phone) {
          smsService
            .sendOrderConfirmationSMS(phone, orderNumber, order.totalAmount)
            .catch((error) => {
              console.error('Error sending order confirmation SMS:', error);
            });
        }

        // Admin notifications run off the critical path — OrderItem.find() is async
        // and should not delay the browser redirect response.
        const customerName = (populatedOrder.userId as any)?.name || 'Customer';
        const customerEmail = (populatedOrder.userId as any)?.email || '';
        const shippingAddress = (populatedOrder.shippingAddressId as any) || {};
        const paymentMethod = order.paymentMethod;
        const totalAmount = order.totalAmount;
        const orderId = order._id;

        Promise.resolve().then(async () => {
          try {
            const orderItems = await OrderItem.find({ orderId });
            const itemCount = orderItems.reduce((sum: number, i: any) => sum + i.quantity, 0);

            whatsappService.notifyNewOrder({
              orderNumber,
              customerName,
              totalAmount,
              itemCount,
              paymentMethod,
            }).catch((error) => {
              console.error('Error sending Telegram order notification:', error);
            });

            emailService.notifyAdminNewOrder({
              orderNumber,
              customerName,
              customerEmail,
              totalAmount,
              itemCount,
              paymentMethod,
              shippingAddress,
            }).catch((error) => {
              console.error('Error sending admin email notification:', error);
            });

            smsService.notifyAdminOrderConfirmed(orderNumber, customerName, totalAmount, paymentMethod).catch((error) => {
              console.error('Error sending admin order confirmed SMS:', error);
            });
          } catch (err) {
            console.error('Error sending admin notifications:', err);
          }
        });
      } catch (error) {
        console.error('Error sending customer notifications:', error);
      }

      // Return success page
      return new NextResponse(
        generateSuccessHTML(order._id.toString(), orderNumber),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Handle payment failure
    else {
      console.log('Payment failed:', { status: verificationResult.status });

      transaction.status = 'failed';
      transaction.gatewayResponse = verificationResult.gatewayResponse;
      await transaction.save();

      // Keep order status as pending (allow retry)
      order.lastStatusUpdate = new Date();
      await order.save();

      // Send failure notifications
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('shippingAddressId')
          .populate('userId');

        emailService.sendPaymentFailed(populatedOrder).catch((error) => {
          console.error('Error sending failure email:', error);
        });

        const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
        if (phone) {
          smsService.sendPaymentFailedSMS(phone, orderNumber).catch((error) => {
            console.error('Error sending failure SMS:', error);
          });
        }

        const customerName = (populatedOrder.userId as any)?.name || 'Customer';
        const customerEmail = (populatedOrder.userId as any)?.email || '';
        whatsappService.notifyPaymentFailed({
          orderNumber,
          customerName,
          totalAmount: order.totalAmount,
        }).catch((error) => {
          console.error('Error sending payment failed admin notification:', error);
        });

        emailService.notifyAdminPaymentFailed({
          orderNumber,
          customerName,
          customerEmail,
          totalAmount: order.totalAmount,
        }).catch((error) => {
          console.error('Error sending admin payment failed email:', error);
        });

        smsService.notifyAdminPaymentFailed(orderNumber, customerName, order.totalAmount).catch((error) => {
          console.error('Error sending admin payment failed SMS:', error);
        });
      } catch (error) {
        console.error('Error sending failure notifications:', error);
      }

      return new NextResponse(
        generateFailureHTML(
          order._id.toString(),
          orderNumber,
          verificationResult.status === 'EXPIRED'
            ? 'Payment session expired'
            : 'Payment was not completed'
        ),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error: any) {
    console.error('Error in payment callback:', error);

    return new NextResponse(
      generateErrorHTML(
        'Payment Processing Error',
        'An error occurred while processing your payment. Please contact support.'
      ),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Cashfree webhook handler (POST) for server-to-server notifications
export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request, { component: 'PaymentWebhook' });

  try {
    const rateLimitResponse = await applyRateLimit(request, RateLimitPresets.PAYMENT_CALLBACK);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const signature = request.headers.get('x-webhook-signature') || '';
    const timestamp = request.headers.get('x-webhook-timestamp') || '';
    const rawBody = await request.text();

    // Verify webhook signature
    const isValid = cashfreeService.verifyWebhook(signature, rawBody, timestamp);
    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body.type;
    const orderData = body.data?.order;
    const paymentData = body.data?.payment;

    logger.info('Cashfree webhook received', { eventType, orderId: orderData?.order_id });

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || eventType === 'PAYMENT_FAILED_WEBHOOK') {
      const orderNumber = orderData?.order_id;
      if (!orderNumber) {
        return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
      }

      await connectDB();

      const transaction = await Transaction.findOne({ gatewayOrderId: orderNumber });
      if (!transaction) {
        logger.warn('Transaction not found for webhook', { orderNumber });
        return NextResponse.json({ status: 'ok' });
      }

      // Only update if not already in terminal state
      if (transaction.status === 'success' || transaction.status === 'refunded') {
        return NextResponse.json({ status: 'ok' });
      }

      // Verify payment via API for double-check
      const verification = await cashfreeService.verifyPayment(orderNumber);

      if (verification.success && transaction.status !== 'success') {
        transaction.status = 'success';
        transaction.transactionId = verification.transactionId || paymentData?.cf_payment_id?.toString() || '';
        transaction.paymentMethod = cashfreeService.getPaymentMethod(
          verification.paymentMethod || paymentData?.payment_group || ''
        );
        transaction.gatewayResponse = verification.gatewayResponse;
        await transaction.save();

        // Update order status if not already paid
        const order = await Order.findOne({ orderNumber });
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.orderStatus = 'confirmed';
          order.paymentId = verification.transactionId;
          order.transactionId = verification.transactionId;
          order.paymentMethod = cashfreeService.getPaymentMethod(
            verification.paymentMethod || paymentData?.payment_group || ''
          );
          order.lastStatusUpdate = new Date();
          await order.save();

          // Reduce product stock + bump orderCount (mirrors the GET handler).
          // The `order.paymentStatus !== 'paid'` guard above keeps this from
          // double-running when the browser GET callback already processed it.
          try {
            const webhookOrderItems = await OrderItem.find({ orderId: order._id });
            for (const item of webhookOrderItems) {
              const { filter, update } = buildStockDecrement(item);
              await Product.findOneAndUpdate(filter, update);
            }
          } catch (stockErr) {
            logger.error('Webhook: stock deduction failed', stockErr as Error, { orderNumber });
          }

          // Increment discount usage
          if (order.discountId) {
            Discount.findByIdAndUpdate(order.discountId, { $inc: { totalUsed: 1 } }).catch(() => {});
          }

          // Create shipment — sendNotifications:true so shipment tracking fires.
          // Order confirmation is sent separately below.
          try {
            const shipmentResult = await createShipmentForOrder(order._id.toString(), 'delhivery', true);
            if (shipmentResult.success) {
              logger.info('Shipment created via webhook', { orderNumber, waybill: shipmentResult.waybill });
            } else {
              logger.error('Shipment creation failed via webhook', null, { orderNumber, error: shipmentResult.error });
            }
          } catch (shipmentError) {
            logger.error('Failed to create shipment via webhook', shipmentError as Error, { orderNumber });
          }

          // Send customer notifications (non-blocking) — covers the case where the
          // browser GET callback never fired (tab closed, network timeout, etc.)
          Promise.resolve().then(async () => {
            try {
              const populatedOrder = await Order.findById(order._id)
                .populate('shippingAddressId')
                .populate('userId');

              emailService.sendOrderConfirmation(populatedOrder).catch((err) => {
                console.error('Webhook: order confirmation email error:', err);
              });

              const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
              if (phone) {
                smsService
                  .sendOrderConfirmationSMS(phone, orderNumber, order.totalAmount)
                  .catch((err) => {
                    console.error('Webhook: order confirmation SMS error:', err);
                  });
              }

              const orderItems = await OrderItem.find({ orderId: order._id });
              const itemCount = orderItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
              const customerName = (populatedOrder.userId as any)?.name || 'Customer';
              const customerEmail = (populatedOrder.userId as any)?.email || '';
              const shippingAddress = (populatedOrder.shippingAddressId as any) || {};

              whatsappService.notifyNewOrder({
                orderNumber,
                customerName,
                totalAmount: order.totalAmount,
                itemCount,
                paymentMethod: order.paymentMethod,
              }).catch((err) => {
                console.error('Webhook: Telegram notification error:', err);
              });

              emailService.notifyAdminNewOrder({
                orderNumber,
                customerName,
                customerEmail,
                totalAmount: order.totalAmount,
                itemCount,
                paymentMethod: order.paymentMethod,
                shippingAddress,
              }).catch((err) => {
                console.error('Webhook: admin email error:', err);
              });

              smsService.notifyAdminOrderConfirmed(orderNumber, customerName, order.totalAmount, order.paymentMethod).catch((err) => {
                console.error('Webhook: admin order confirmed SMS error:', err);
              });
            } catch (err) {
              console.error('Webhook: error sending notifications:', err);
            }
          });
        }
      } else if (!verification.success) {
        transaction.status = 'failed';
        transaction.gatewayResponse = verification.gatewayResponse;
        await transaction.save();

        // Mark order as cancelled if Cashfree reports CANCELLED or VOID
        if (['CANCELLED', 'VOID', 'EXPIRED'].includes(verification.status)) {
          const order = await Order.findOne({ orderNumber });
          if (order && order.paymentStatus === 'pending') {
            order.orderStatus = 'cancelled';
            order.cancelledAt = new Date();
            order.lastStatusUpdate = new Date();
            await order.save();
          }
        }
      }
    }

    // Handle refund processed from Cashfree dashboard
    else if (eventType === 'REFUND_STATUS_WEBHOOK') {
      const orderNumber = orderData?.order_id;
      const refundData = body.data?.refund;

      if (!orderNumber) {
        return NextResponse.json({ status: 'ok' });
      }

      await connectDB();

      const order = await Order.findOne({ orderNumber });
      if (!order) {
        logger.warn('Order not found for refund webhook', { orderNumber });
        return NextResponse.json({ status: 'ok' });
      }

      if (refundData?.refund_status === 'SUCCESS' && order.paymentStatus !== 'refunded') {
        const refundAmount = refundData.refund_amount || order.totalAmount;

        // Update order payment status
        order.paymentStatus = 'refunded';
        order.refundAmount = refundAmount;
        order.refundedAt = new Date();
        order.lastStatusUpdate = new Date();
        if (!order.cancelledAt) {
          order.orderStatus = 'cancelled';
          order.cancelledAt = new Date();
        }
        await order.save();

        // Mark the original success transaction as refunded
        await Transaction.findOneAndUpdate(
          { orderId: order._id, status: 'success' },
          {
            $set: {
              status: 'refunded',
              gatewayResponse: {
                refund: {
                  refund_id: refundData.refund_id,
                  refund_status: 'SUCCESS',
                  refund_amount: refundAmount,
                  refund_arn: refundData.refund_arn,
                  refundedAt: new Date(),
                },
              },
            },
          }
        );

        // Create a separate refund transaction record if not already present
        const existingRefundTxn = await Transaction.findOne({
          orderId: order._id,
          gatewayOrderId: `REFUND-${order.orderNumber}`,
        });

        if (!existingRefundTxn) {
          await Transaction.create({
            orderId: order._id,
            gatewayOrderId: `REFUND-${order.orderNumber}`,
            transactionId: refundData.refund_id || '',
            amount: refundAmount,
            status: 'refunded',
            retryCount: 0,
            gatewayResponse: {
              type: 'refund',
              refund_id: refundData.refund_id,
              refund_arn: refundData.refund_arn,
              reason: refundData.refund_note || 'Refund processed by Cashfree',
              refundedAt: new Date(),
            },
          });
        }

        logger.info('Refund processed via webhook', {
          orderNumber,
          refundAmount,
          refundId: refundData.refund_id,
        });
      }
    }

    // Handle user-dropped payment (user closed the payment page without completing)
    else if (eventType === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      const orderNumber = orderData?.order_id;
      if (!orderNumber) {
        return NextResponse.json({ status: 'ok' });
      }

      await connectDB();

      const transaction = await Transaction.findOne({ gatewayOrderId: orderNumber });
      if (transaction && !['success', 'refunded'].includes(transaction.status)) {
        transaction.status = 'failed';
        transaction.gatewayResponse = body.data;
        await transaction.save();

        logger.info('Payment user-dropped recorded', { orderNumber });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// HTML response generators
function generateSuccessHTML(orderId: string, orderNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: scaleIn 0.5s ease-out;
          }
          .checkmark {
            font-size: 48px;
            color: white;
          }
          h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 12px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .order-number {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
          }
          .order-number strong {
            color: #f97316;
            font-size: 18px;
          }
          .button {
            display: inline-block;
            background: #f97316;
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background 0.3s;
          }
          .button:hover {
            background: #ea580c;
          }
          @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">
            <span class="checkmark">\u2713</span>
          </div>
          <h1>Payment Successful!</h1>
          <p>Your payment has been processed successfully. Your order is confirmed and will be shipped soon.</p>
          <div class="order-number">
            <p><strong>Order Number</strong></p>
            <p><strong>${orderNumber}</strong></p>
          </div>
          <p>You will receive an email confirmation shortly with order details and tracking information.</p>
          <a href="${baseUrl}/orders/${orderNumber}" class="button">View Order Details</a>
        </div>
        <script>
          // Auto-redirect after 5 seconds
          setTimeout(() => {
            window.location.href = '${baseUrl}/orders/${orderNumber}';
          }, 5000);
        </script>
      </body>
    </html>
  `;
}

function generateFailureHTML(
  orderId: string,
  orderNumber: string,
  message: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
          }
          .error-icon {
            width: 80px;
            height: 80px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          .cross {
            font-size: 48px;
            color: white;
          }
          h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 12px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .error-message {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
            text-align: left;
          }
          .button {
            display: inline-block;
            background: #f97316;
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 8px;
            transition: background 0.3s;
          }
          .button:hover {
            background: #ea580c;
          }
          .button-secondary {
            background: #6b7280;
          }
          .button-secondary:hover {
            background: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">
            <span class="cross">\u2715</span>
          </div>
          <h1>Payment Failed</h1>
          <p>We're sorry, but your payment could not be processed.</p>
          <div class="error-message">
            <p><strong>Reason:</strong> ${message}</p>
            <p style="margin-top: 8px;"><strong>Order:</strong> ${orderNumber}</p>
          </div>
          <p>Don't worry, your order is still saved. You can retry the payment or choose a different payment method.</p>
          <a href="${baseUrl}/orders/${orderNumber}" class="button">Retry Payment</a>
          <a href="${baseUrl}/cart" class="button button-secondary">Back to Cart</a>
        </div>
      </body>
    </html>
  `;
}

function generateErrorHTML(title: string, message: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
          }
          h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 16px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .button {
            display: inline-block;
            background: #f97316;
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background 0.3s;
          }
          .button:hover {
            background: #ea580c;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="${baseUrl}/orders" class="button">View Orders</a>
        </div>
      </body>
    </html>
  `;
}
