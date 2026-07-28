import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Shipment from '@/models/Shipment';
import { getShippingProvider } from './providerFactory';
import type { ShipmentCreationData } from './types';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { isManualDeliveryPincode } from '@/lib/constants';

/**
 * Create a shipment for a paid (or COD-confirmed) order using the specified provider.
 *
 * @param orderId           MongoDB ObjectId string
 * @param provider          'delhivery' (default) | 'shiprocket'
 * @param sendNotifications Set false when the caller will handle notifications itself
 *                          (e.g. payment callback POST webhook) to avoid double-sending.
 */
export async function createShipmentForOrder(
  orderId: string,
  provider: 'delhivery' | 'shiprocket' = 'delhivery',
  sendNotifications = true
): Promise<{ success: boolean; waybill?: string; trackingUrl?: string; error?: string }> {
  try {
    await connectDB();

    const order = await Order.findById(orderId)
      .populate('shippingAddressId')
      .populate('userId');

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Accept both paid online orders and COD orders (paymentStatus: 'pending', orderStatus: 'confirmed')
    const isCod = order.paymentMethod === 'cod' && order.orderStatus === 'confirmed';
    if (order.paymentStatus !== 'paid' && !isCod) {
      return { success: false, error: 'Order must be paid or COD-confirmed before creating shipment' };
    }

    // Idempotency: return existing shipment if already created
    const existing = await Shipment.findOne({ orderId: order._id });
    if (existing) {
      return { success: true, waybill: existing.waybill, trackingUrl: existing.trackingUrl };
    }

    const shippingAddress = order.shippingAddressId as any;
    if (!shippingAddress) {
      return { success: false, error: 'No shipping address found for order' };
    }

    // Local hand-delivery zone (e.g. the store's own Bhopal pincode): the store
    // delivers these itself, so never hand them to a courier. Record a 'manual'
    // shipment so the order still tracks a status, and let admin fulfil it.
    if (isManualDeliveryPincode(shippingAddress.postalCode)) {
      return createManualShipment(order, shippingAddress, sendNotifications);
    }

    const shippingService = getShippingProvider(provider);
    // Estimated delivery days for order update (best-effort, no pre-check gate)
    const serviceability = { estimatedDays: 3 };

    // Build items + weight
    const orderItems = await OrderItem.find({ orderId: order._id }).populate('productId');
    const totalWeight = orderItems.reduce((sum, item) => {
      const product = item.productId as any;
      return sum + (product?.weight || 500) * item.quantity;
    }, 0);

    const creationData: ShipmentCreationData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: shippingAddress.fullName,
      customerPhone: shippingAddress.phoneNumber,
      customerEmail: (order.userId as any)?.email,
      deliveryAddress: {
        line1: shippingAddress.addressLine1,
        line2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
      },
      items: orderItems.map((item) => ({
        name: item.productName,
        sku: item.productSku || item.productName,
        quantity: item.quantity,
        price: item.priceAtPurchase,
        weight: (item.productId as any)?.weight || 500,
      })),
      totalWeight,
      totalValue: order.subtotal,
      paymentMethod: isCod ? 'cod' : 'prepaid',
      codAmount: isCod ? order.totalAmount : undefined,
    };

    const response = await shippingService.createShipment(creationData);

    if (!response.success || !response.result) {
      console.error(`${provider} shipment creation failed:`, response.error);
      return { success: false, error: response.error || `${provider} API failed` };
    }

    const { waybill, shipmentId, courierName, trackingUrl, estimatedDelivery } = response.result;

    // Persist Shipment record
    const shipment = await Shipment.create({
      orderId: order._id,
      waybill,
      courierName,
      provider,
      providerShipmentId: shipmentId,
      trackingUrl,
      shipmentStatus: 'Pending',
      scans: [
        {
          status: 'Shipment Created',
          location: 'Warehouse',
          timestamp: new Date(),
          remarks: `Shipment created via ${provider}`,
        },
      ],
    });

    // Update Order
    order.trackingNumber = waybill;
    order.shippingProvider = provider;
    order.orderStatus = 'processing';
    order.shipmentCreatedAt = new Date();
    order.lastStatusUpdate = new Date();

    const deliveryDate = estimatedDelivery
      ? new Date(estimatedDelivery)
      : new Date(Date.now() + (serviceability.estimatedDays || 3) * 86_400_000);
    order.estimatedDeliveryDate = deliveryDate;

    await order.save();

    // Notifications (skipped when the caller owns them)
    if (sendNotifications) {
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('shippingAddressId')
          .populate('userId');

        emailService.sendShipmentCreated(populatedOrder, shipment).catch((err) => {
          console.error('Error sending shipment email:', err);
        });

        const phone = (populatedOrder.shippingAddressId as any)?.phoneNumber;
        if (phone) {
          smsService.sendShipmentSMS(phone, order.orderNumber, waybill).catch((err) => {
            console.error('Error sending shipment SMS:', err);
          });
        }

        const customerName = (populatedOrder.userId as any)?.name || 'Customer';
        const customerEmail = (populatedOrder.userId as any)?.email || '';
        emailService.notifyAdminShipmentCreated(
          { orderNumber: order.orderNumber, customerName, customerEmail },
          { waybill, provider, trackingUrl }
        ).catch((err) => {
          console.error('Error sending admin shipment email:', err);
        });
        smsService.notifyAdminShipmentCreated(order.orderNumber, waybill, customerName).catch((err) => {
          console.error('Error sending admin shipment SMS:', err);
        });
      } catch (err) {
        console.error('Error sending shipment notifications:', err);
      }
    }

    console.log(`Shipment created via ${provider} for order ${order.orderNumber} — waybill: ${waybill}`);
    return { success: true, waybill, trackingUrl };
  } catch (error: any) {
    console.error('Error in createShipmentForOrder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fulfilment path for local hand-delivery pincodes: no courier API is called.
 * Records a 'manual' shipment and moves the order to processing so the customer
 * sees progress and admin (who already badges these orders) can hand-deliver.
 */
async function createManualShipment(
  order: any,
  shippingAddress: any,
  sendNotifications: boolean
): Promise<{ success: boolean; waybill?: string; trackingUrl?: string; error?: string }> {
  // Synthetic waybill keeps the Shipment.waybill unique constraint satisfied
  // without a courier; orderNumber is itself unique.
  const waybill = `LOCAL-${order.orderNumber}`;

  await Shipment.create({
    orderId: order._id,
    waybill,
    courierName: 'Local delivery',
    provider: 'manual',
    providerShipmentId: '',
    shipmentStatus: 'Manual delivery',
    scans: [
      {
        status: 'Manual delivery',
        location: 'Local — Bhopal',
        timestamp: new Date(),
        remarks: 'Local hand-delivery by store staff (no courier)',
      },
    ],
  });

  order.shippingProvider = 'manual';
  order.orderStatus = 'processing';
  order.shipmentCreatedAt = new Date();
  order.lastStatusUpdate = new Date();
  // Local delivery is same/next day.
  order.estimatedDeliveryDate = new Date(Date.now() + 86_400_000);
  await order.save();

  if (sendNotifications) {
    try {
      const phone = shippingAddress.phoneNumber;
      if (phone) {
        smsService.sendLocalDeliverySMS(phone, order.orderNumber).catch((err) => {
          console.error('Error sending local-delivery SMS:', err);
        });
      }
      const customerName = shippingAddress.fullName || 'Customer';
      smsService.notifyAdminManualDelivery(order.orderNumber, customerName).catch((err) => {
        console.error('Error sending admin manual-delivery SMS:', err);
      });
    } catch (err) {
      console.error('Error sending manual-delivery notifications:', err);
    }
  }

  console.log(`Manual (local) delivery recorded for order ${order.orderNumber}`);
  return { success: true, waybill };
}
