import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Address from '@/models/Address';
import Prescription from '@/models/Prescription';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { v1CreateOrderSchema } from '@/lib/validations/v1-orders';
import { calculateShipping } from '@/lib/shipping/calculateShipping';
import { calculateOrderGST } from '@/lib/gst';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import {
  assertPrescriptionForCart,
  cartRequiresPrescription,
  PrescriptionRequiredError,
} from '@/lib/checkout/prescription-guard';

export const runtime = 'nodejs';

/**
 * POST /api/v1/checkout/create-order — creates a pending order.
 * Bearer auth required. Enforces prescription rule server-side.
 * Recomputes all prices server-side; never trusts client values.
 */
export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, RateLimitPresets.CREATE_ORDER);
  if (rateLimited) return rateLimited;

  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const body = await req.json();
    const parsed = v1CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return v1Error('Invalid request', 400, 'VALIDATION_ERROR');
    }

    const { items, shippingAddressId, prescriptionId, discountId } = parsed.data;

    // Verify address belongs to user
    const address = await Address.findOne({
      _id: shippingAddressId,
      userId,
    });

    if (!address) {
      return v1Error('Shipping address not found', 404, 'ADDRESS_NOT_FOUND');
    }

    // ─────────────────────────────────────────────────────────────────────
    // CRITICAL: reload all products from DB and recompute prices.
    // Never trust client-supplied prices.
    // ─────────────────────────────────────────────────────────────────────
    const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: uniqueProductIds }, isActive: true });

    if (products.length !== uniqueProductIds.length) {
      return v1Error('Some products not found or inactive', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check stock for each item
    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) {
        return v1Error(`Product ${item.productId} not found`, 404, 'PRODUCT_NOT_FOUND');
      }
      if (product.stock < item.quantity) {
        return v1Error(
          `Insufficient stock for ${product.name}`,
          409,
          'OUT_OF_STOCK'
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // CRITICAL: Prescription enforcement (root CLAUDE.md rule #3).
    // Schedule H/H1/X products require a verified or pending prescription.
    // ─────────────────────────────────────────────────────────────────────
    let linkedPrescriptionId: string | undefined;
    if (cartRequiresPrescription(products)) {
      const prescription = prescriptionId
        ? await Prescription.findOne({ _id: prescriptionId, userId })
        : null;

      try {
        assertPrescriptionForCart(products, prescription, userId);
      } catch (err) {
        if (err instanceof PrescriptionRequiredError) {
          return v1Error(err.message, 422, 'PRESCRIPTION_REQUIRED');
        }
        throw err;
      }
      linkedPrescriptionId = String(prescription!._id);
    }

    // Compute subtotal and GST (prices are inclusive of tax)
    let subtotal = 0;
    let totalWeight = 0;
    const orderItems = [];
    const gstItems: Array<{ inclusivePrice: number; quantity: number; gstRate: number }> = [];

    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) continue;

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      totalWeight += (product.weight || 500) * item.quantity;

      const gstRate = product.gstRate ?? 5;
      gstItems.push({ inclusivePrice: product.price, quantity: item.quantity, gstRate });

      orderItems.push({
        productId: product._id,
        gstRate,
        productName: product.name,
        productSku: product.sku,
        productImage: typeof product.images?.[0] === 'string'
          ? product.images[0]
          : product.images?.[0]?.url || '',
        quantity: item.quantity,
        priceAtPurchase: product.price,
        subtotal: itemSubtotal,
      });
    }

    // Calculate shipping
    const shippingCalc = calculateShipping(subtotal, totalWeight, address.postalCode);
    const shippingCost = shippingCalc.tier.cost;

    // Calculate GST
    const gstBreakdown = calculateOrderGST(gstItems, address.state || '');
    const { taxAmount, cgst, sgst, igst, isIntraState } = gstBreakdown;

    // Apply discount if provided (re-validate)
    let discountAmount = 0;
    if (discountId) {
      // For v1, simplified discount handling. Full logic in web API.
      // In production, you'd want the same discount lib shared.
      discountAmount = 0; // TODO: implement discount validation lib for v1
    }

    const totalAmount = Math.max(0, subtotal + shippingCost - discountAmount);

    // Generate order number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `ORD-${timestamp}-${random}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      userId,
      items: [],
      subtotal,
      shippingCost,
      taxAmount,
      cgst,
      sgst,
      igst,
      isIntraState,
      discountAmount,
      totalAmount,
      orderStatus: 'pending',
      paymentMethod: 'card',
      paymentStatus: 'pending',
      shippingAddressId,
      billingAddressId: shippingAddressId,
      notes: '',
      shippingProvider: 'delhivery',
      shippingMethod: shippingCost > 100 ? 'express' : 'standard',
      prescriptionId: linkedPrescriptionId,
    });

    // Create order items
    const createdOrderItems = await OrderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        orderId: order._id,
      }))
    );

    // Link items to order
    order.items = createdOrderItems.map((item) => item._id);
    await order.save();

    // Link prescription to order for audit trail
    if (linkedPrescriptionId) {
      await Prescription.findByIdAndUpdate(linkedPrescriptionId, { orderId: order._id });
    }

    return v1Ok(
      {
        order: {
          _id: String(order._id),
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
        },
      },
      201
    );
  } catch (err) {
    console.error('v1 create order error:', err);
    return v1Error('Could not create order', 500, 'INTERNAL_ERROR');
  }
}
