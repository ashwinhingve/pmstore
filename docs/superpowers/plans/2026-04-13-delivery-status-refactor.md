# Delivery Status System Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand order statuses from 5 to 12 granular states, centralize all status updates through a single service, fix Shiprocket/Delhivery provider mappings, update all UI surfaces, and backfill stale statuses via migration script.

**Architecture:** A new `updateOrderStatus()` service in `src/lib/orders/` becomes the single write path for `Order.orderStatus`. All webhook handlers, admin routes, and the poll-tracking route call this service instead of writing to the order directly. The service handles notifications, timestamps, and transition validation in one place.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Mongoose/MongoDB, Lucide React icons, Tailwind CSS, ts-node (for migration script).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/constants.ts` | Modify | Expand ORDER_STATUS + export OrderStatus type |
| `src/models/Order.ts` | Modify | Expand orderStatus enum to include 7 new states |
| `src/lib/shipping/shiprocket.ts` | Modify | Fix mapStatus() — 6 new accurate mappings |
| `src/lib/shipping/delhivery.ts` | Modify | Fix mapStatus() — 6 new accurate mappings |
| `src/lib/orders/updateOrderStatus.ts` | Create | Centralized status update service |
| `src/app/api/shipping/webhook/status-update/route.ts` | Modify | Use updateOrderStatus, remove inline notification code |
| `src/app/api/shipping/webhook/route.ts` | Modify | Use updateOrderStatus, remove inline notification code |
| `src/app/api/admin/orders/[orderId]/status/route.ts` | Modify | Use updateOrderStatus, expand valid statuses list |
| `src/app/api/shipping/poll-tracking/route.ts` | Modify | Use updateOrderStatus, remove inline notification code |
| `src/components/orders/OrderTimeline.tsx` | Modify | Add pickup_scheduled, out_for_delivery, RTO/loss branches |
| `src/components/admin/OrderStatusManager.tsx` | Modify | Add 6 new statuses to dropdown, extend terminal-state check |
| `src/scripts/migrateDeliveryStatuses.ts` | Create | One-time backfill script for stale order statuses |

---

## Task 1: Expand ORDER_STATUS Constants

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Replace ORDER_STATUS block**

In `src/lib/constants.ts`, replace lines 16–22:

```typescript
// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RTO: 'rto',
  RTO_DELIVERED: 'rto_delivered',
  LOST: 'lost',
  DAMAGED: 'damaged',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: expand ORDER_STATUS constants to 12 granular delivery states"
```

---

## Task 2: Update Order Model Schema

**Files:**
- Modify: `src/models/Order.ts`

- [ ] **Step 1: Update the orderStatus union type in IOrder**

In `src/models/Order.ts`, replace the `orderStatus` field in the `IOrder` interface (lines 19–26):

```typescript
  orderStatus:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'pickup_scheduled'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'rto'
    | 'rto_delivered'
    | 'lost'
    | 'damaged'
    | 'refunded';
```

- [ ] **Step 2: Update the orderStatus field in OrderSchema**

Find the `orderStatus` field in the Schema definition (search for `enum:` near `orderStatus`). Replace the enum array with:

```typescript
    orderStatus: {
      type: String,
      enum: [
        'pending', 'confirmed', 'processing', 'pickup_scheduled',
        'shipped', 'out_for_delivery', 'delivered', 'cancelled',
        'rto', 'rto_delivered', 'lost', 'damaged', 'refunded',
      ],
      default: 'pending',
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/models/Order.ts
git commit -m "feat: expand Order.orderStatus schema to 12 delivery states"
```

---

## Task 3: Fix Shiprocket Status Mapping

**Files:**
- Modify: `src/lib/shipping/shiprocket.ts` (lines 406–429)

- [ ] **Step 1: Replace the mapStatus() method body**

In `src/lib/shipping/shiprocket.ts`, replace the entire `mapStatus` method:

```typescript
  mapStatus(shiprocketStatus: string): string {
    const upper = (shiprocketStatus || '').toUpperCase();
    const statusMap: Record<string, string> = {
      'PENDING': 'processing',
      'MANIFESTED': 'processing',
      'PICKUP PENDING': 'pickup_scheduled',
      'PICKUP QUEUED': 'pickup_scheduled',
      'PICKUP ERROR': 'pickup_scheduled',
      'PICKUP RESCHEDULED': 'pickup_scheduled',
      'SHIPPED': 'shipped',
      'IN TRANSIT': 'shipped',
      'DELIVERY FAILED': 'shipped',
      'OUT FOR DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled',
      'RTO INITIATED': 'rto',
      'RTO': 'rto',
      'RTO OUT FOR DELIVERY': 'rto_delivered',
      'RTO DELIVERED': 'rto_delivered',
      'LOST': 'lost',
      'DAMAGED': 'damaged',
    };
    return statusMap[upper] || 'processing';
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shipping/shiprocket.ts
git commit -m "fix: correct Shiprocket status mapping — pickup_scheduled, out_for_delivery, rto, lost, damaged"
```

---

## Task 4: Fix Delhivery Status Mapping

**Files:**
- Modify: `src/lib/shipping/delhivery.ts` (lines 268–285)

- [ ] **Step 1: Replace the mapStatus() method body**

In `src/lib/shipping/delhivery.ts`, replace the entire `mapStatus` method:

```typescript
  mapStatus(delhiveryStatus: string): string {
    const statusMap: Record<string, string> = {
      'Pending': 'processing',
      'Manifested': 'processing',
      'Dispatched': 'pickup_scheduled',
      'In Transit': 'shipped',
      'Transit Delay': 'shipped',
      'Misrouted': 'shipped',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'RTO Initiated': 'rto',
      'RTO': 'rto',
      'RTO Out for Delivery': 'rto',
      'RTO Delivered': 'rto_delivered',
      'Lost': 'lost',
      'Damaged': 'damaged',
    };
    return statusMap[delhiveryStatus] || 'processing';
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shipping/delhivery.ts
git commit -m "fix: correct Delhivery status mapping — pickup_scheduled, out_for_delivery, rto, rto_delivered, lost, damaged"
```

---

## Task 5: Create Centralized updateOrderStatus Service

**Files:**
- Create: `src/lib/orders/updateOrderStatus.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/orders/updateOrderStatus.ts` with this content:

```typescript
import Order from '@/models/Order';
import { emailService } from '@/lib/notifications/email';
import { smsService } from '@/lib/notifications/sms';
import { OrderStatus } from '@/lib/constants';

export type StatusSource =
  | 'shiprocket_webhook'
  | 'delhivery_webhook'
  | 'payment'
  | 'admin'
  | 'poll'
  | 'shipment_creation';

interface UpdateOptions {
  /** Skip email/SMS notifications (use for admin manual overrides) */
  skipNotifications?: boolean;
  /** Raw provider status string for logging context */
  providerStatus?: string;
}

interface UpdateResult {
  /** True if orderStatus actually changed */
  changed: boolean;
  previousStatus: string;
}

/**
 * The single function that writes Order.orderStatus.
 *
 * Handles:
 * - Setting lastStatusUpdate, deliveredAt, cancelledAt timestamps
 * - Sending delivery/out-for-delivery/RTO notifications
 * - Returning whether the status actually changed
 *
 * The caller must have already called connectDB() before invoking this.
 * The order must exist — pass the orderId (string or ObjectId).
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  source: StatusSource,
  options: UpdateOptions = {}
): Promise<UpdateResult> {
  const order = await Order.findById(orderId)
    .populate('shippingAddressId')
    .populate('userId');

  if (!order) {
    throw new Error(`updateOrderStatus: Order ${orderId} not found`);
  }

  const previousStatus = order.orderStatus as string;

  if (previousStatus === newStatus) {
    return { changed: false, previousStatus };
  }

  // Write new status + timestamps
  order.orderStatus = newStatus as any;
  order.lastStatusUpdate = new Date();

  if (newStatus === 'delivered') {
    order.deliveredAt = new Date();
    order.actualDeliveryDate = new Date();
  }

  if (['cancelled', 'rto', 'rto_delivered', 'lost', 'damaged'].includes(newStatus)) {
    if (!order.cancelledAt) {
      order.cancelledAt = new Date();
    }
  }

  await order.save();

  // Notifications (non-blocking, fire-and-forget)
  if (!options.skipNotifications) {
    const phone = (order.shippingAddressId as any)?.phoneNumber as string | undefined;

    if (newStatus === 'delivered') {
      emailService.sendOrderDelivered(order).catch((e) =>
        console.error(`[updateOrderStatus] delivery email failed (${orderId}):`, e)
      );
      if (phone) {
        smsService.sendDeliverySMS(phone, order.orderNumber).catch((e) =>
          console.error(`[updateOrderStatus] delivery SMS failed (${orderId}):`, e)
        );
      }
    } else if (newStatus === 'out_for_delivery') {
      if (phone) {
        smsService.sendOutForDeliverySMS(phone, order.orderNumber).catch((e) =>
          console.error(`[updateOrderStatus] OFD SMS failed (${orderId}):`, e)
        );
      }
    }
  }

  console.log(
    `[updateOrderStatus] ${order.orderNumber}: ${previousStatus} → ${newStatus} (source: ${source}${options.providerStatus ? ', provider: ' + options.providerStatus : ''})`
  );

  return { changed: true, previousStatus };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/orders/updateOrderStatus.ts
git commit -m "feat: add centralized updateOrderStatus service"
```

---

## Task 6: Refactor Shiprocket Webhook to Use updateOrderStatus

**Files:**
- Modify: `src/app/api/shipping/webhook/status-update/route.ts`

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import { shiprocketService } from '@/lib/shipping/shiprocket';
import { updateOrderStatus } from '@/lib/orders/updateOrderStatus';
import { OrderStatus } from '@/lib/constants';

/**
 * Shiprocket webhook handler.
 *
 * In Shiprocket Dashboard → Settings → Webhooks:
 *   URL:   https://yourdomain.com/api/shipping/webhook/status-update
 *   Token: (set any random string here AND set it as SHIPROCKET_WEBHOOK_SECRET env var)
 *
 * Shiprocket sends the token in the `x-api-key` request header.
 * Note: URL must NOT contain the words "shiprocket", "kartrocket", "sr", or "kr".
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (secret) {
    const incomingKey = request.headers.get('x-api-key') || '';
    if (incomingKey !== secret) {
      console.warn('Shiprocket webhook: invalid x-api-key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('Shiprocket webhook event:', JSON.stringify(event));

  const awb: string = event.awb || event.awb_code || '';
  const currentStatus: string = event.current_status || event.status || '';

  if (!awb) {
    return NextResponse.json({ received: true, skipped: 'no awb' });
  }

  try {
    await connectDB();

    const shipment = await Shipment.findOne({ waybill: awb });
    if (!shipment) {
      console.warn(`Shiprocket webhook: shipment not found for AWB ${awb}`);
      return NextResponse.json({ received: true, skipped: 'shipment not found' });
    }

    let shipmentUpdated = false;

    // Update shipment-level status and location
    if (currentStatus && currentStatus !== shipment.shipmentStatus) {
      shipment.shipmentStatus = currentStatus;
      shipmentUpdated = true;
    }
    if (event.current_status_description) {
      shipment.currentLocation = event.current_status_description;
    }

    // Push new scan (deduplicated by timestamp + activity)
    const scanTimestamp = event.date ? new Date(event.date) : new Date();
    const scanActivity: string = event.activity || currentStatus || '';
    const scanLocation: string = event.location || event.city || '';

    if (scanActivity) {
      const duplicate = shipment.scans.find(
        (s: any) =>
          new Date(s.timestamp).getTime() === scanTimestamp.getTime() &&
          s.status === scanActivity
      );

      if (!duplicate) {
        shipment.scans.push({
          status: scanActivity,
          location: scanLocation,
          timestamp: scanTimestamp,
          remarks: currentStatus,
        });
        shipment.scans.sort(
          (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        shipmentUpdated = true;
      }
    }

    const mappedStatus = shiprocketService.mapStatus(currentStatus) as OrderStatus;

    if (mappedStatus === 'delivered' && !shipment.deliveryDate) {
      shipment.deliveryDate = new Date();
      shipmentUpdated = true;
    }

    if (shipmentUpdated) {
      await shipment.save();
    }

    // Update order status via centralized service (handles notifications)
    if (mappedStatus) {
      await updateOrderStatus(shipment.orderId.toString(), mappedStatus, 'shiprocket_webhook', {
        providerStatus: currentStatus,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Shiprocket webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shipping/webhook/status-update/route.ts
git commit -m "refactor: Shiprocket webhook uses updateOrderStatus service"
```

---

## Task 7: Refactor Delhivery Webhook to Use updateOrderStatus

**Files:**
- Modify: `src/app/api/shipping/webhook/route.ts`

- [ ] **Step 1: Replace the order-update block (lines 155–204)**

Keep everything above line 155 unchanged. Replace the block from `// 7. Update order status` to the end of the if-block (line 204) with:

```typescript
    // 7. Update order status via centralized service (handles notifications)
    if (order) {
      const mappedStatus = delhiveryService.mapStatus(status) as OrderStatus;
      await updateOrderStatus(shipment.orderId.toString(), mappedStatus, 'delhivery_webhook', {
        providerStatus: status,
      });
    }
```

- [ ] **Step 2: Add the missing import at the top of the file**

After the existing imports add:

```typescript
import { updateOrderStatus } from '@/lib/orders/updateOrderStatus';
import { OrderStatus } from '@/lib/constants';
```

Remove the now-unused imports `emailService` and `smsService` from the top of the file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shipping/webhook/route.ts
git commit -m "refactor: Delhivery webhook uses updateOrderStatus service"
```

---

## Task 8: Refactor Admin Status Route

**Files:**
- Modify: `src/app/api/admin/orders/[orderId]/status/route.ts`

- [ ] **Step 1: Add import for updateOrderStatus**

At the top of the file, after the existing imports, add:

```typescript
import { updateOrderStatus } from '@/lib/orders/updateOrderStatus';
import { OrderStatus } from '@/lib/constants';
```

- [ ] **Step 2: Replace the validStatuses array (line 30)**

```typescript
    const validStatuses = [
      'pending', 'confirmed', 'processing', 'pickup_scheduled',
      'shipped', 'out_for_delivery', 'delivered', 'cancelled',
      'rto', 'rto_delivered', 'lost', 'damaged',
    ];
```

- [ ] **Step 3: Replace the order-update block (lines 59–97)**

Replace everything from `// Update order status` through `await order.save()` (before the logger.info call) with:

```typescript
    // Handle refund when admin cancels a paid order
    if (status === 'cancelled' && order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      order.refundAmount = order.totalAmount;
      order.refundedAt = new Date();
      order.refundReason = 'Order cancelled by admin';

      await Transaction.create({
        orderId: order._id,
        gatewayOrderId: `REFUND-${order.orderNumber}`,
        amount: order.totalAmount,
        status: 'refunded',
        retryCount: 0,
        gatewayResponse: {
          type: 'refund',
          reason: 'Order cancelled by admin',
          refundedAt: new Date(),
        },
      });

      await Transaction.findOneAndUpdate(
        { orderId: order._id, status: 'success' },
        {
          $set: {
            gatewayResponse: {
              refund: {
                status: 'initiated',
                amount: order.totalAmount,
                reason: 'Order cancelled by admin',
                initiatedAt: new Date(),
              },
            },
          },
        }
      );

      await order.save(); // save refund fields before updateOrderStatus loads the order
    }

    // Update status via centralized service (skipNotifications — admin overrides are silent)
    const { previousStatus } = await updateOrderStatus(
      orderId,
      status as OrderStatus,
      'admin',
      { skipNotifications: true }
    );
```

- [ ] **Step 4: Update the logger.info call to use previousStatus from service**

Replace:
```typescript
    logger.info('Order status updated', {
      orderId,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: status,
      adminId: adminCheck.session.user.id,
    });
```
With (remove the now-wrong `previousStatus` local variable reference — it comes from the service):
```typescript
    const updatedOrder = await Order.findById(orderId);

    logger.info('Order status updated', {
      orderId,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: status,
      adminId: adminCheck.session.user.id,
    });
```

- [ ] **Step 5: Update the return payload to use updatedOrder**

Replace `order.orderStatus`, `order.paymentStatus` etc. in the return payload with `updatedOrder?.orderStatus` etc. so it reflects the final DB state:

```typescript
    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        orderStatus: updatedOrder?.orderStatus ?? status,
        paymentStatus: updatedOrder?.paymentStatus ?? order.paymentStatus,
        refundAmount: updatedOrder?.refundAmount || 0,
        refundedAt: updatedOrder?.refundedAt?.toISOString() || null,
        cancelledAt: updatedOrder?.cancelledAt?.toISOString() || null,
        lastStatusUpdate: updatedOrder?.lastStatusUpdate,
      },
    });
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/orders/[orderId]/status/route.ts
git commit -m "refactor: admin status route uses updateOrderStatus, expands valid statuses to 12"
```

---

## Task 9: Refactor Poll-Tracking to Use updateOrderStatus

**Files:**
- Modify: `src/app/api/shipping/poll-tracking/route.ts`

- [ ] **Step 1: Add imports**

At the top, after existing imports, add:

```typescript
import { updateOrderStatus } from '@/lib/orders/updateOrderStatus';
import { OrderStatus } from '@/lib/constants';
```

Remove the now-unused imports of `emailService`, `smsService` if they are only used for notifications in this file.

- [ ] **Step 2: Replace the order-update + notification block inside the per-shipment async handler**

In `src/app/api/shipping/poll-tracking/route.ts`, find and replace the block at lines 122–161 (starting with `if (updated) {` through the closing `}` before `results.push(...)`):

```typescript
              if (updated) {
                await shipment.save();
              }

              // Update order status via centralized service (handles notifications)
              const mappedStatus = shippingService.mapStatus(trackingData.status) as OrderStatus;
              const { changed } = await updateOrderStatus(
                shipment.orderId.toString(),
                mappedStatus,
                'poll',
                { providerStatus: trackingData.status }
              );

              results.push({ waybill: shipment.waybill, status: trackingData.status, updated: updated || changed });
```

(Remove the old `Order.findById` + `order.save()` + notification block that was previously in that location.)

- [ ] **Step 3: Remove unused imports**

Remove `Order`, `User`, `emailService`, `smsService` from the import list at the top of the file — they are no longer used in this route.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shipping/poll-tracking/route.ts
git commit -m "refactor: poll-tracking uses updateOrderStatus service"
```

---

## Task 10: Update Customer OrderTimeline

**Files:**
- Modify: `src/components/orders/OrderTimeline.tsx`

- [ ] **Step 1: Add MapPin to the imports from lucide-react**

Replace line 1:
```typescript
import { CheckCircle, Clock, MapPin, Package, Truck, Home, XCircle, AlertTriangle } from 'lucide-react';
```

- [ ] **Step 2: Replace the steps-building block (lines 36–143)**

Replace from `// Build timeline steps` through `return <Timeline steps={steps} formatDate={formatDate} />` with:

```typescript
  // Terminal failure statuses — show error branch
  const TERMINAL_FAILURE = ['rto', 'rto_delivered', 'lost', 'damaged', 'cancelled'];
  const FORWARD_STATUSES = [
    'processing', 'pickup_scheduled', 'shipped', 'out_for_delivery', 'delivered',
  ];

  // Build timeline steps
  const steps: TimelineStep[] = [];

  // 1. Order Placed
  steps.push({
    label: 'Order Placed',
    date: createdAt,
    status: 'completed',
    icon: CheckCircle,
  });

  // 2. Payment
  if (paymentStatus === 'paid' || paymentStatus === 'success') {
    steps.push({
      label: 'Payment Confirmed',
      date: createdAt,
      status: 'completed',
      icon: CheckCircle,
    });
  } else if (paymentStatus === 'failed') {
    return <FailedTimeline createdAt={createdAt} formatDate={formatDate} />;
  } else {
    steps.push({ label: 'Awaiting Payment', date: null, status: 'current', icon: Clock });
    return <Timeline steps={steps} formatDate={formatDate} />;
  }

  // 3. Order Confirmed
  const isConfirmedOrBeyond = ['confirmed', ...FORWARD_STATUSES].includes(orderStatus);
  if (isConfirmedOrBeyond) {
    steps.push({ label: 'Order Confirmed', date: createdAt, status: 'completed', icon: CheckCircle });
  } else if (TERMINAL_FAILURE.includes(orderStatus)) {
    steps.push({ label: 'Order Confirmed', date: createdAt, status: 'completed', icon: CheckCircle });
  } else {
    steps.push({ label: 'Confirming Order', date: null, status: 'current', icon: Clock });
    return <Timeline steps={steps} formatDate={formatDate} />;
  }

  // 4. Processing
  const isProcessingOrBeyond = FORWARD_STATUSES.includes(orderStatus);
  steps.push({
    label: 'Processing',
    date: null,
    status: isProcessingOrBeyond ? 'completed' : TERMINAL_FAILURE.includes(orderStatus) ? 'completed' : 'upcoming',
    icon: Package,
  });

  // 5. Pickup Scheduled
  const isPickupOrBeyond = ['pickup_scheduled', 'shipped', 'out_for_delivery', 'delivered'].includes(orderStatus);
  steps.push({
    label: 'Pickup Scheduled',
    date: null,
    status: isPickupOrBeyond
      ? 'completed'
      : orderStatus === 'pickup_scheduled'
      ? 'current'
      : TERMINAL_FAILURE.includes(orderStatus)
      ? 'completed'
      : 'upcoming',
    icon: MapPin,
  });

  // 6. Shipped / In Transit
  const isShippedOrBeyond = ['shipped', 'out_for_delivery', 'delivered'].includes(orderStatus);
  steps.push({
    label: 'Shipped',
    date: shipmentDate,
    status: isShippedOrBeyond
      ? 'completed'
      : orderStatus === 'shipped'
      ? 'current'
      : TERMINAL_FAILURE.includes(orderStatus)
      ? 'completed'
      : 'upcoming',
    icon: Truck,
  });

  // 7. Out for Delivery
  const isOFDOrBeyond = ['out_for_delivery', 'delivered'].includes(orderStatus);
  steps.push({
    label: 'Out for Delivery',
    date: null,
    status: isOFDOrBeyond
      ? 'completed'
      : orderStatus === 'out_for_delivery'
      ? 'current'
      : TERMINAL_FAILURE.includes(orderStatus)
      ? 'completed'
      : 'upcoming',
    icon: Truck,
  });

  // 8. Terminal: Delivered or failure branch
  if (orderStatus === 'delivered') {
    steps.push({ label: 'Delivered', date: null, status: 'completed', icon: Home });
  } else if (orderStatus === 'rto' || orderStatus === 'rto_delivered') {
    steps.push({
      label: orderStatus === 'rto_delivered' ? 'Returned to Seller' : 'Return Initiated (RTO)',
      date: null,
      status: 'current',
      icon: AlertTriangle,
    });
  } else if (orderStatus === 'lost') {
    steps.push({ label: 'Shipment Lost', date: null, status: 'current', icon: AlertTriangle });
  } else if (orderStatus === 'damaged') {
    steps.push({ label: 'Shipment Damaged', date: null, status: 'current', icon: AlertTriangle });
  } else if (orderStatus === 'cancelled') {
    steps.push({ label: 'Order Cancelled', date: null, status: 'current', icon: XCircle });
  } else {
    steps.push({
      label: 'Delivered',
      date: estimatedDelivery ? `Est. ${formatDate(estimatedDelivery)}` : null,
      status: 'upcoming',
      icon: Home,
    });
  }

  return <Timeline steps={steps} formatDate={formatDate} />;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/orders/OrderTimeline.tsx
git commit -m "feat: customer timeline shows pickup_scheduled, out_for_delivery, RTO/loss branches"
```

---

## Task 11: Update Admin OrderStatusManager

**Files:**
- Modify: `src/components/admin/OrderStatusManager.tsx`

- [ ] **Step 1: Replace statusOptions array (lines 17–24)**

```typescript
const statusOptions = [
  { value: 'pending',           label: 'Pending',           color: 'bg-gray-100 text-gray-700' },
  { value: 'confirmed',         label: 'Confirmed',         color: 'bg-blue-100 text-blue-700' },
  { value: 'processing',        label: 'Processing',        color: 'bg-purple-100 text-purple-700' },
  { value: 'pickup_scheduled',  label: 'Pickup Scheduled',  color: 'bg-cyan-100 text-cyan-700' },
  { value: 'shipped',           label: 'Shipped',           color: 'bg-indigo-100 text-indigo-700' },
  { value: 'out_for_delivery',  label: 'Out for Delivery',  color: 'bg-blue-100 text-blue-700' },
  { value: 'delivered',         label: 'Delivered',         color: 'bg-green-100 text-green-700' },
  { value: 'cancelled',         label: 'Cancelled',         color: 'bg-red-100 text-red-700' },
  { value: 'rto',               label: 'RTO',               color: 'bg-orange-100 text-orange-700' },
  { value: 'rto_delivered',     label: 'RTO Delivered',     color: 'bg-orange-100 text-orange-700' },
  { value: 'lost',              label: 'Lost',              color: 'bg-red-200 text-red-800' },
  { value: 'damaged',           label: 'Damaged',           color: 'bg-red-100 text-red-700' },
];
```

- [ ] **Step 2: Update the isCancelled terminal-state check (line 86)**

Replace:
```typescript
  const isCancelled = currentStatus === 'cancelled';
```
With:
```typescript
  const TERMINAL_STATUSES = ['cancelled', 'rto', 'rto_delivered', 'lost', 'damaged', 'refunded'];
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);
```

- [ ] **Step 3: Replace all uses of isCancelled with isTerminal**

In the JSX, replace:
- `{isCancelled && liveRefundAmount > 0 && (` → `{isTerminal && liveRefundAmount > 0 && (`
- `{isCancelled && liveCancelledAt && (` → `{isTerminal && liveCancelledAt && (`
- `{!isCancelled && (` → `{!isTerminal && (`

Also update the `currentStatusOption` fallback to display `pickup_scheduled` as `Pickup Scheduled` — the statusOptions array already handles this via the `find()`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/OrderStatusManager.tsx
git commit -m "feat: admin status manager includes 6 new delivery statuses and extended terminal check"
```

---

## Task 12: Migration Script — Backfill Stale Statuses

**Files:**
- Create: `src/scripts/migrateDeliveryStatuses.ts`

- [ ] **Step 1: Create the script**

```typescript
/**
 * One-time migration: re-poll active shipments and correct Order.orderStatus.
 *
 * Run: npx ts-node --project tsconfig.json src/scripts/migrateDeliveryStatuses.ts
 *
 * Requires MONGODB_URI (and SHIPROCKET_*/DELHIVERY_* env vars) to be set.
 * Safe to run multiple times — updateOrderStatus is a no-op if status hasn't changed.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Register models BEFORE importing services that reference them
import '../models/Order';
import '../models/Shipment';
import '../models/Transaction';
import '../models/User';

import Shipment from '../models/Shipment';
import { getShippingProvider } from '../lib/shipping/providerFactory';
import { updateOrderStatus } from '../lib/orders/updateOrderStatus';
import { OrderStatus } from '../lib/constants';

const TERMINAL_STATUSES = [
  'Delivered', 'RTO Delivered', 'Cancelled', 'Lost', 'Damaged',
  'DELIVERED', 'CANCELLED', 'LOST', 'DAMAGED', 'RTO DELIVERED',
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const shipments = await Shipment.find({
    shipmentStatus: { $nin: TERMINAL_STATUSES },
  });

  console.log(`Found ${shipments.length} non-terminal shipments to check`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const shipment of shipments) {
    try {
      const provider = getShippingProvider(shipment.provider);
      const result = await provider.trackShipment(shipment.providerShipmentId);

      if (!result) {
        console.warn(`  [skip] ${shipment.waybill} — no tracking result`);
        skipped++;
        continue;
      }

      const mappedStatus = provider.mapStatus(result.status) as OrderStatus;

      const { changed, previousStatus } = await updateOrderStatus(
        shipment.orderId.toString(),
        mappedStatus,
        'poll',
        { skipNotifications: true, providerStatus: result.status }
      );

      if (changed) {
        console.log(`  [updated] ${shipment.waybill}: ${previousStatus} → ${mappedStatus} (provider: ${result.status})`);
        updated++;
      } else {
        skipped++;
      }

      // Avoid hammering APIs — small delay between requests
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      console.error(`  [error] ${shipment.waybill}:`, err.message);
      failed++;
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Total:   ${shipments.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/scripts/migrateDeliveryStatuses.ts
git commit -m "feat: add delivery status migration script to backfill stale order statuses"
```

---

## Task 13: Update Validation Schema — Add Missing Delhivery Statuses

**Files:**
- Modify: `src/lib/validations/shipping.ts`

- [ ] **Step 1: Extend VALID_SHIPMENT_STATUSES**

In `src/lib/validations/shipping.ts`, replace the `VALID_SHIPMENT_STATUSES` array (lines 45–57):

```typescript
export const VALID_SHIPMENT_STATUSES = [
  'Pending',
  'Manifested',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Transit Delay',
  'Misrouted',
  'Delivered',
  'RTO',
  'RTO Initiated',
  'RTO Out for Delivery',
  'RTO Delivered',
  'Cancelled',
  'Lost',
  'Damaged',
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/shipping.ts
git commit -m "fix: add missing Delhivery status strings to VALID_SHIPMENT_STATUSES"
```

---

## Task 14: Update Admin OrderTimelineAdmin Component

**Files:**
- Modify: `src/components/admin/OrderTimelineAdmin.tsx`

- [ ] **Step 1: Add MapPin and AlertTriangle to imports**

Replace line 1:
```typescript
import { CheckCircle, Clock, MapPin, Package, Truck, Home, XCircle, AlertTriangle } from 'lucide-react';
```

- [ ] **Step 2: Replace the events-building block (lines 36–149)**

Replace from `// Build timeline events based on order status` through `return <Timeline events={events} formatDate={formatDate} />` with:

```typescript
  const TERMINAL_FAILURE = ['rto', 'rto_delivered', 'lost', 'damaged', 'cancelled'];
  const FORWARD_STATUSES = ['processing', 'pickup_scheduled', 'shipped', 'out_for_delivery', 'delivered'];

  // Build timeline events
  const events: TimelineEvent[] = [];

  // 1. Order Placed
  events.push({ label: 'Order Placed', date: createdAt, status: 'completed', icon: CheckCircle });

  // 2. Payment
  if (paymentStatus === 'paid' || paymentStatus === 'success') {
    events.push({ label: 'Payment Confirmed', date: createdAt, status: 'completed', icon: CheckCircle });
  } else if (paymentStatus === 'failed') {
    events.push({ label: 'Payment Failed', date: createdAt, status: 'completed', icon: XCircle });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else {
    events.push({ label: 'Awaiting Payment', date: null, status: 'current', icon: Clock });
    return <Timeline events={events} formatDate={formatDate} />;
  }

  // 3. Order Confirmed
  const isConfirmedOrBeyond = ['confirmed', ...FORWARD_STATUSES, ...TERMINAL_FAILURE].includes(orderStatus);
  if (isConfirmedOrBeyond) {
    events.push({ label: 'Order Confirmed', date: lastStatusUpdate || createdAt, status: 'completed', icon: CheckCircle });
  } else {
    events.push({ label: 'Confirm Order', date: null, status: orderStatus === 'pending' ? 'current' : 'pending', icon: Clock });
  }

  // 4. Processing
  const isProcessingOrBeyond = [...FORWARD_STATUSES, ...TERMINAL_FAILURE].includes(orderStatus) && orderStatus !== 'confirmed';
  events.push({
    label: 'Processing',
    date: isProcessingOrBeyond ? (lastStatusUpdate || null) : null,
    status: isProcessingOrBeyond ? 'completed' : orderStatus === 'processing' ? 'current' : 'pending',
    icon: Package,
  });

  // 5. Pickup Scheduled
  const isPickupOrBeyond = ['pickup_scheduled', 'shipped', 'out_for_delivery', 'delivered', ...TERMINAL_FAILURE.filter(s => s !== 'cancelled')].includes(orderStatus);
  events.push({
    label: 'Pickup Scheduled',
    date: isPickupOrBeyond ? (lastStatusUpdate || null) : null,
    status: isPickupOrBeyond ? 'completed' : orderStatus === 'pickup_scheduled' ? 'current' : 'pending',
    icon: MapPin,
  });

  // 6. Shipped
  const isShippedOrBeyond = ['shipped', 'out_for_delivery', 'delivered'].includes(orderStatus);
  events.push({
    label: 'Shipped',
    date: isShippedOrBeyond ? (shipmentDate || lastStatusUpdate || null) : null,
    status: isShippedOrBeyond ? 'completed' : orderStatus === 'shipped' ? 'current' : 'pending',
    icon: Truck,
  });

  // 7. Out for Delivery
  const isOFDOrBeyond = ['out_for_delivery', 'delivered'].includes(orderStatus);
  events.push({
    label: 'Out for Delivery',
    date: isOFDOrBeyond ? (lastStatusUpdate || null) : null,
    status: isOFDOrBeyond ? 'completed' : orderStatus === 'out_for_delivery' ? 'current' : 'pending',
    icon: Truck,
  });

  // 8. Terminal step
  if (orderStatus === 'delivered') {
    events.push({ label: 'Delivered', date: lastStatusUpdate || null, status: 'completed', icon: Home });
  } else if (orderStatus === 'rto' || orderStatus === 'rto_delivered') {
    events.push({
      label: orderStatus === 'rto_delivered' ? 'Returned to Seller (RTO)' : 'Return Initiated (RTO)',
      date: lastStatusUpdate || null,
      status: 'current',
      icon: AlertTriangle,
    });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else if (orderStatus === 'lost') {
    events.push({ label: 'Shipment Lost', date: lastStatusUpdate || null, status: 'current', icon: AlertTriangle });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else if (orderStatus === 'damaged') {
    events.push({ label: 'Shipment Damaged', date: lastStatusUpdate || null, status: 'current', icon: AlertTriangle });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else if (orderStatus === 'cancelled') {
    events.push({ label: 'Order Cancelled', date: lastStatusUpdate || createdAt, status: 'completed', icon: XCircle });
    return <FailedTimeline events={events} formatDate={formatDate} />;
  } else {
    events.push({ label: 'Delivered', date: null, status: 'pending', icon: Home });
  }

  return <Timeline events={events} formatDate={formatDate} />;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/OrderTimelineAdmin.tsx
git commit -m "feat: admin timeline shows pickup_scheduled, out_for_delivery, RTO/loss branches"
```

---

## Task 15: Update ShipmentsTable — Add Shiprocket Status Colors and Filter Options

**Files:**
- Modify: `src/components/admin/ShipmentsTable.tsx`

- [ ] **Step 1: Extend statusConfig to include Shiprocket UPPERCASE statuses**

In `src/components/admin/ShipmentsTable.tsx`, extend `statusConfig` (after line 76, before the closing `}`):

```typescript
  // Shiprocket native statuses (stored uppercase in Shipment.shipmentStatus)
  'PENDING': { color: 'bg-yellow-100 text-yellow-700', label: 'Pending (SR)' },
  'MANIFESTED': { color: 'bg-blue-50 text-blue-600', label: 'Manifested (SR)' },
  'PICKUP PENDING': { color: 'bg-cyan-100 text-cyan-700', label: 'Pickup Pending' },
  'PICKUP QUEUED': { color: 'bg-cyan-100 text-cyan-700', label: 'Pickup Queued' },
  'PICKUP ERROR': { color: 'bg-orange-100 text-orange-700', label: 'Pickup Error' },
  'PICKUP RESCHEDULED': { color: 'bg-orange-100 text-orange-700', label: 'Pickup Rescheduled' },
  'SHIPPED': { color: 'bg-indigo-100 text-indigo-700', label: 'Shipped (SR)' },
  'IN TRANSIT': { color: 'bg-purple-100 text-purple-700', label: 'In Transit (SR)' },
  'OUT FOR DELIVERY': { color: 'bg-cyan-100 text-cyan-700', label: 'Out for Delivery (SR)' },
  'DELIVERED': { color: 'bg-green-100 text-green-700', label: 'Delivered (SR)' },
  'DELIVERY FAILED': { color: 'bg-orange-100 text-orange-700', label: 'Delivery Failed' },
  'CANCELLED': { color: 'bg-red-100 text-red-700', label: 'Cancelled (SR)' },
  'RTO INITIATED': { color: 'bg-orange-100 text-orange-700', label: 'RTO Initiated' },
  'RTO': { color: 'bg-orange-100 text-orange-700', label: 'RTO (SR)' },
  'RTO OUT FOR DELIVERY': { color: 'bg-orange-100 text-orange-700', label: 'RTO Out for Delivery' },
  'RTO DELIVERED': { color: 'bg-orange-100 text-orange-700', label: 'RTO Delivered (SR)' },
  'LOST': { color: 'bg-red-200 text-red-800', label: 'Lost (SR)' },
  'DAMAGED': { color: 'bg-red-100 text-red-700', label: 'Damaged (SR)' },
  // Delhivery additions
  'RTO Initiated': { color: 'bg-orange-100 text-orange-700', label: 'RTO Initiated' },
  'RTO Out for Delivery': { color: 'bg-orange-100 text-orange-700', label: 'RTO Out for Delivery' },
  'Transit Delay': { color: 'bg-orange-50 text-orange-600', label: 'Transit Delay' },
  'Misrouted': { color: 'bg-orange-100 text-orange-700', label: 'Misrouted' },
```

- [ ] **Step 2: Find the status filter `<select>` in the JSX and add new options**

Search for `<option value="">All Statuses</option>` in the file. After the existing status options, add:

```tsx
  <optgroup label="Pickup">
    <option value="PICKUP PENDING">Pickup Pending</option>
    <option value="PICKUP QUEUED">Pickup Queued</option>
    <option value="PICKUP ERROR">Pickup Error</option>
    <option value="PICKUP RESCHEDULED">Pickup Rescheduled</option>
    <option value="Dispatched">Dispatched (Delhivery)</option>
  </optgroup>
  <optgroup label="In Transit">
    <option value="In Transit">In Transit (Delhivery)</option>
    <option value="IN TRANSIT">In Transit (Shiprocket)</option>
    <option value="Transit Delay">Transit Delay</option>
    <option value="Misrouted">Misrouted</option>
    <option value="Out for Delivery">Out for Delivery (Delhivery)</option>
    <option value="OUT FOR DELIVERY">Out for Delivery (Shiprocket)</option>
    <option value="DELIVERY FAILED">Delivery Failed</option>
  </optgroup>
  <optgroup label="Returns">
    <option value="RTO Initiated">RTO Initiated</option>
    <option value="RTO">RTO</option>
    <option value="RTO Out for Delivery">RTO Out for Delivery</option>
    <option value="RTO Delivered">RTO Delivered</option>
    <option value="RTO INITIATED">RTO Initiated (SR)</option>
    <option value="RTO DELIVERED">RTO Delivered (SR)</option>
  </optgroup>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ShipmentsTable.tsx
git commit -m "feat: ShipmentsTable displays Shiprocket statuses with colors and extended filter options"
```

---

## Verification Checklist

- [ ] **1. Shiprocket mapping:** Confirm `shiprocketService.mapStatus('PICKUP QUEUED')` returns `'pickup_scheduled'`
- [ ] **2. Delhivery mapping:** Confirm `delhiveryService.mapStatus('Out for Delivery')` returns `'out_for_delivery'`
- [ ] **3. Webhook smoke test (Shiprocket):** POST to `/api/shipping/webhook/status-update` with `{ awb: '<valid-waybill>', current_status: 'PICKUP QUEUED' }` and correct `x-api-key` header — verify `Order.orderStatus` becomes `pickup_scheduled`
- [ ] **4. Webhook smoke test (Delhivery):** POST to `/api/shipping/webhook` with valid HMAC and `{ waybill, status: 'Out for Delivery', ... }` — verify `Order.orderStatus` becomes `out_for_delivery`
- [ ] **5. Admin UI:** Load `/admin/orders/<id>` for a shipped order — confirm `pickup_scheduled` and `out_for_delivery` appear in the status dropdown
- [ ] **6. Customer UI:** Load `/orders/<id>` for an order with status `out_for_delivery` — confirm both "Pickup Scheduled" and "Out for Delivery" steps appear highlighted in the timeline
- [ ] **7. RTO branch:** Manually set an order to `rto` via admin — confirm customer timeline shows "Return Initiated (RTO)" in the error branch
- [ ] **8. Payment sync:** Open an admin order page for a `pending` payment order older than 5 min — verify the sync triggers (see plan note: this requires the admin order detail page change described in the design spec but not covered here — add as a follow-up task if needed)
- [ ] **9. Migration:** Run `npx ts-node --project tsconfig.json src/scripts/migrateDeliveryStatuses.ts` against staging — verify summary output and spot-check 3 orders in the DB
