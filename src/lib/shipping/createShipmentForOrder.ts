import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Shipment from '@/models/Shipment';
import { getShippingProvider, getDefaultProvider } from './providerFactory';
import type { ShipmentCreationData } from './types';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { isManualRoute } from './delivery-policy';
import { massInGrams, parcelSchema, type ConfirmedParcel, type CourierEstimate } from './parcel';

/**
 * Create a shipment for a paid (or COD-confirmed) order using the specified provider.
 *
 * @param orderId           MongoDB ObjectId string
 * @param providerArg       'delhivery' | 'shiprocket'. Omit to use the env default
 *                          (DEFAULT_SHIPPING_PROVIDER, see getDefaultProvider()).
 * @param sendNotifications Set false when the caller will handle notifications itself
 *                          (e.g. payment callback POST webhook) to avoid double-sending.
 */
export async function createShipmentForOrder(
  orderId: string,
  providerArg?: 'delhivery' | 'shiprocket',
  sendNotifications = true,
  confirmation?: { parcel: ConfirmedParcel; estimate?: CourierEstimate },
): Promise<{ success: boolean; waybill?: string; trackingUrl?: string; error?: string }> {
  const provider = providerArg ?? getDefaultProvider();
  let claimed = false;
  let dispatched = false;
  try {
    await connectDB();

    const order = await Order.findById(orderId)
      .populate('shippingAddressId')
      .populate('userId');

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Idempotency: return existing shipment if already created
    const existing = await Shipment.findOne({ orderId: order._id });
    if (existing) {
      return { success: true, waybill: existing.waybill, trackingUrl: existing.trackingUrl };
    }

    // Accept both paid online orders and COD orders (paymentStatus: 'pending', orderStatus: 'confirmed')
    const isCod = order.paymentMethod === 'cod' && order.paymentStatus === 'pending' && order.orderStatus === 'confirmed';
    if (['cancelled', 'refunded', 'delivered', 'shipped'].includes(order.orderStatus) ||
        (order.paymentStatus !== 'paid' && !isCod)) {
      return { success: false, error: 'Order must be paid or COD-confirmed before creating shipment' };
    }

    const shippingAddress = order.shippingAddressId as any;
    if (!shippingAddress) {
      return { success: false, error: 'No shipping address found for order' };
    }

    // Local hand-delivery zone (e.g. the store's own Bhopal pincode): the store
    // delivers these itself, so never hand them to a courier. Record a 'manual'
    // shipment so the order still tracks a status, and let admin fulfil it.
    if (isManualRoute(shippingAddress.postalCode, order.pickupLocation)) {
      return createManualShipment(order, shippingAddress, sendNotifications);
    }

    if (!confirmation || !parcelSchema.safeParse({
      weightGrams: confirmation.parcel.weightGrams,
      lengthCm: confirmation.parcel.lengthCm,
      widthCm: confirmation.parcel.widthCm,
      heightCm: confirmation.parcel.heightCm,
    }).success || !confirmation.parcel.confirmedBy) {
      return { success: false, error: 'Admin must confirm the measured packed weight and dimensions before courier booking.' };
    }
    if (provider === 'delhivery' && (!process.env.DELHIVERY_API_KEY?.trim() ||
        !/^\d{6}$/.test(order.pickupLocation?.pincode ?? process.env.DELHIVERY_RETURN_PINCODE?.trim() ?? '') ||
        !(order.pickupLocation?.delhiveryWarehouse ?? process.env.DELHIVERY_RETURN_NAME?.trim()))) {
      return { success: false, error: 'Configure Delhivery credentials, pickup PIN and registered warehouse before booking.' };
    }
    if (provider === 'shiprocket' && order.pickupLocation && !order.pickupLocation.shiprocketWarehouse) {
      return { success: false, error: 'Map this pickup to its registered Shiprocket warehouse before booking.' };
    }
    if (provider === 'shiprocket' && !(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD)) {
      return { success: false, error: 'Configure Shiprocket credentials before booking.' };
    }

    // One claim covers payment callbacks, admin double clicks, workers and retries.
    // Never expire this claim automatically: a timed-out request may have booked remotely.
    const claim = await Order.findOneAndUpdate({
      _id: order._id,
      shipmentBookingState: { $nin: ['creating', 'uncertain', 'booked'] },
      orderStatus: { $nin: ['cancelled', 'refunded', 'delivered', 'shipped'] },
      paymentStatus: order.paymentStatus,
      'confirmedParcel.confirmedAt': confirmation.parcel.confirmedAt,
      'confirmedParcel.weightGrams': confirmation.parcel.weightGrams,
      'confirmedParcel.lengthCm': confirmation.parcel.lengthCm,
      'confirmedParcel.widthCm': confirmation.parcel.widthCm,
      'confirmedParcel.heightCm': confirmation.parcel.heightCm,
      trackingNumber: { $in: [null, ''] },
    }, {
      $set: {
        confirmedParcel: confirmation.parcel,
        shipmentBookingState: 'creating',
        shipmentBookingStartedAt: new Date(),
      },
      $unset: { courierEstimate: 1 },
    }, { new: true });
    if (!claim) {
      return { success: false, error: 'Booking is in progress or needs reconciliation. Check the courier dashboard before retrying.' };
    }
    claimed = true;
    if (confirmation.estimate) {
      await Order.updateOne({ _id: order._id }, { $set: { courierEstimate: confirmation.estimate } });
    }
    const shippingService = getShippingProvider(provider);
    const serviceability = { estimatedDays: 3 };
    const orderItems = await OrderItem.find({ orderId: order._id }).populate('productId');
    const totalWeight = confirmation.parcel.weightGrams;

    const creationData: ShipmentCreationData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      pickupLocation: order.pickupLocation,
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
        weight: massInGrams((item.productId as any)?.weight, (item.productId as any)?.weightUnit),
      })),
      totalWeight,
      parcel: confirmation.parcel,
      totalValue: order.subtotal,
      paymentMethod: isCod ? 'cod' : 'prepaid',
      codAmount: isCod ? order.totalAmount : undefined,
    };

    dispatched = true;
    const response = await shippingService.createShipment(creationData);

    if (!response.success || !response.result) {
      await Order.updateOne({ _id: order._id }, { $set: { shipmentBookingState: 'uncertain' } });
      return { success: false, error: 'The courier did not confirm booking. Check its dashboard before retrying; a shipment may already exist.' };
    }

    const { waybill, shipmentId, courierName, trackingUrl, estimatedDelivery } = response.result;

    // Persist Shipment record
    const shipment = await Shipment.create({
      orderId: order._id,
      waybill,
      parcel: confirmation.parcel,
      pickupLocation: order.pickupLocation,
      courierEstimate: confirmation.estimate,
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
    order.shipmentBookingState = 'booked';
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
    if (claimed) {
      await Order.updateOne({ _id: orderId }, dispatched
        ? { $set: { shipmentBookingState: 'uncertain' } }
        : { $unset: { shipmentBookingState: 1, shipmentBookingStartedAt: 1 } }).catch(() => {});
    }
    console.error('Shipment creation failed', { orderId, dispatched });
    return { success: false, error: dispatched
      ? 'Booking needs reconciliation. Check the courier dashboard before retrying.'
      : 'Unable to prepare shipment. Check the parcel and order details.' };
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

/** Payment confirmation may fulfil local orders; courier bookings always need an admin. */
export async function createLocalShipmentForOrder(orderId: string): Promise<{ success: boolean; waybill?: string; error?: string }> {
  await connectDB();
  const order = await Order.findById(orderId).populate('shippingAddressId');
  if (!order || !isManualRoute(order.shippingAddressId?.postalCode, order.pickupLocation)) {
    return { success: true }; // awaiting admin parcel confirmation, not a booking failure
  }
  return createShipmentForOrder(orderId);
}
