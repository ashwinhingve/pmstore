import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Product from '@/models/Product';
import Address from '@/models/Address';
import Discount from '@/models/Discount';
import Prescription from '@/models/Prescription';
import { calculateShipping } from '@/lib/shipping/calculateShipping';
import { calculateOrderGST } from '@/lib/gst';
import {
  assertPrescriptionForCart,
  cartRequiresPrescription,
  PrescriptionRequiredError,
} from '@/lib/checkout/prescription-guard';

/**
 * POST /api/checkout/create-order
 * Create a new order with pending payment status.
 * Optionally accepts discountId to apply a validated discount.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate input
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    if (!body.shippingAddressId) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify shipping address exists and belongs to user
    const shippingAddress = await Address.findOne({
      _id: body.shippingAddressId,
      userId: session.user.id,
    });

    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Invalid shipping address' },
        { status: 404 }
      );
    }

    // Fetch and validate products (deduplicate IDs — multiple variants share one product)
    const uniqueProductIds = [...new Set(body.items.map((item: any) => item.productId))];
    const products = await Product.find({ _id: { $in: uniqueProductIds } });

    if (products.length !== uniqueProductIds.length) {
      return NextResponse.json(
        { error: 'Some products not found' },
        { status: 404 }
      );
    }

    // ── Prescription enforcement (root CLAUDE.md rule #3, non-negotiable) ──
    // Schedule H/H1/X items need a valid prescription attached. Enforced here,
    // server-side, before any order exists — the UI gate is not access control.
    let prescriptionId: string | undefined;
    if (cartRequiresPrescription(products)) {
      const prescription = body.prescriptionId
        ? await Prescription.findOne({ _id: body.prescriptionId, userId: session.user.id })
        : null;
      try {
        assertPrescriptionForCart(products, prescription, session.user.id);
      } catch (err) {
        if (err instanceof PrescriptionRequiredError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }
      prescriptionId = String(prescription!._id);
    }

    // Check stock availability
    for (const item of body.items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (item.variantId) {
        const variant = product.variants.find((v: any) => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json(
            { error: `Variant not found for ${product.name}` },
            { status: 404 }
          );
        }
        if (!variant.isActive) {
          return NextResponse.json(
            { error: `Variant ${variant.name} is no longer available` },
            { status: 400 }
          );
        }
        if (variant.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name} - ${variant.name}` },
            { status: 400 }
          );
        }
      } else {
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}` },
            { status: 400 }
          );
        }
      }
    }

    // Calculate totals
    let subtotal = 0;
    let totalWeight = 0;

    const orderItems = [];
    const gstItems: Array<{ inclusivePrice: number; quantity: number; gstRate: number }> = [];

    for (const item of body.items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) continue;

      // Resolve variant pricing when a variant was selected
      let resolvedPrice = product.price;
      let resolvedSku = product.sku;
      let resolvedName = product.name;
      let resolvedWeight = product.weight;
      const resolvedGstRate: number = product.gstRate ?? 5;

      if (item.variantId) {
        const variant = product.variants.find((v: any) => v.id === item.variantId);
        if (variant) {
          resolvedPrice = variant.price;
          resolvedSku = variant.sku;
          resolvedName = `${product.name} - ${variant.name}`;
          resolvedWeight = variant.weight ?? product.weight;
        }
      }

      const itemSubtotal = resolvedPrice * item.quantity;
      subtotal += itemSubtotal;
      totalWeight += resolvedWeight * item.quantity;

      gstItems.push({ inclusivePrice: resolvedPrice, quantity: item.quantity, gstRate: resolvedGstRate });

      orderItems.push({
        productId: product._id,
        variantId: item.variantId || null,
        gstRate: resolvedGstRate,
        productName: resolvedName,
        productSku: resolvedSku,
        productImage: (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url) || '',
        quantity: item.quantity,
        priceAtPurchase: resolvedPrice,
        subtotal: itemSubtotal,
      });
    }

    // Calculate shipping cost
    const shippingCalc = calculateShipping(
      subtotal,
      totalWeight,
      shippingAddress.postalCode
    );
    const shippingCost = shippingCalc.tier.cost;

    // Calculate GST — prices are GST-inclusive; tax is extracted, NOT added on top
    const gstBreakdown = calculateOrderGST(gstItems, shippingAddress.state || '');
    const { taxAmount, cgst, sgst, igst, isIntraState } = gstBreakdown;

    // ── Validate and apply discount ────────────────────────────
    let discountAmount = 0;
    let discountCode: string | undefined;
    let discountId: any;

    if (body.discountId) {
      const now = new Date();
      const discount = await Discount.findById(body.discountId).lean() as any;

      let discountValid = false;
      let discountError = '';

      if (!discount) {
        discountError = 'Discount not found';
      } else if (!discount.isActive) {
        discountError = 'Discount is no longer active';
      } else if (discount.validFrom > now) {
        discountError = 'Discount is not yet valid';
      } else if (discount.validTo && discount.validTo < now) {
        discountError = 'Discount has expired';
      } else if (discount.minOrderValue > 0 && subtotal < discount.minOrderValue) {
        discountError = `Minimum order of ₹${discount.minOrderValue} required`;
      } else if (discount.maxUsageTotal > 0 && discount.totalUsed >= discount.maxUsageTotal) {
        discountError = 'Discount usage limit reached';
      } else if (discount.type === 'first_order') {
        // Verify user truly has no prior non-cancelled orders
        const priorOrders = await Order.countDocuments({
          userId: session.user.id,
          orderStatus: { $nin: ['cancelled'] },
        });
        if (priorOrders > 0) {
          discountError = 'First-order discount is only for new customers';
        } else {
          discountValid = true;
        }
      } else if (discount.type === 'coupon') {
        // Verify per-user usage
        if (discount.maxUsagePerUser > 0) {
          const used = await Order.countDocuments({
            userId: session.user.id,
            discountId: discount._id,
            orderStatus: { $nin: ['cancelled'] },
          });
          if (used >= discount.maxUsagePerUser) {
            discountError = 'You have already used this coupon';
          } else {
            discountValid = true;
          }
        } else {
          discountValid = true;
        }
      } else if (discount.type === 'auto') {
        if (discount.maxUsagePerUser > 0) {
          const used = await Order.countDocuments({
            userId: session.user.id,
            discountId: discount._id,
            orderStatus: { $nin: ['cancelled'] },
          });
          discountValid = used < discount.maxUsagePerUser;
          if (!discountValid) discountError = 'Discount usage limit reached for your account';
        } else {
          discountValid = true;
        }
      }

      if (discountError) {
        return NextResponse.json({ error: discountError }, { status: 400 });
      }

      if (discountValid) {
        if (discount.discountType === 'fixed') {
          discountAmount = discount.discountValue;
        } else {
          discountAmount = (subtotal * discount.discountValue) / 100;
          if (discount.maxDiscountAmount > 0) {
            discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
          }
        }
        discountAmount = Math.min(Math.round(discountAmount * 100) / 100, subtotal);
        discountCode = discount.code || `OFFER_${discount._id.toString().slice(-6).toUpperCase()}`;
        discountId = discount._id;
      }
    }

    // Final total — tax is ALREADY inside subtotal (prices are GST-inclusive)
    const totalAmount = Math.max(0, subtotal + shippingCost - discountAmount);

    // Generate order number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `ORD-${timestamp}-${random}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      userId: session.user.id,
      items: [],
      subtotal,
      shippingCost,
      taxAmount,
      cgst,
      sgst,
      igst,
      isIntraState,
      discountAmount,
      discountCode,
      discountId,
      prescriptionId,
      totalAmount,
      orderStatus: 'pending',
      paymentMethod: 'card',
      paymentStatus: 'pending',
      shippingAddressId: body.shippingAddressId,
      billingAddressId: body.billingAddressId || body.shippingAddressId,
      notes: body.notes || '',
      shippingProvider: 'delhivery',
      shippingMethod: shippingCalc.tier.cost > 100 ? 'express' : 'standard',
    });

    // Create order items
    const createdOrderItems = await OrderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        orderId: order._id,
      }))
    );

    // Update order with item IDs
    order.items = createdOrderItems.map((item) => item._id);
    await order.save();

    // Link the prescription back to this order for the Rx audit trail.
    if (prescriptionId) {
      await Prescription.findByIdAndUpdate(prescriptionId, { orderId: order._id });
    }

    // Note: discount totalUsed is incremented in confirm-cod/payment-success,
    // not here, so abandoned orders don't consume discount quota.

    return NextResponse.json(
      {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
        },
        message: 'Order created successfully. Ready for payment.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Create order error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create order',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
