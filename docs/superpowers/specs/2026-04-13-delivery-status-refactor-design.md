# Delivery Status System Refactor — Design Spec

**Date:** 2026-04-13  
**Status:** Approved

---

## Context

The delivery status system has four active failure modes:

1. **Pickup statuses invisible** — Shiprocket statuses like `PICKUP PENDING`, `PICKUP QUEUED`, `PICKUP ERROR` all collapse into `processing`, so customers and admins see no distinct pickup stage.
2. **RTO / cancellation loss of detail** — `RTO`, `RTO Delivered`, `Lost`, `Damaged` all map to `cancelled`, hiding critical return-logistics state.
3. **Admin/UI display stale or wrong** — status shown in admin panel and customer timeline does not update reliably after webhook fires.
4. **Payment status sync gaps** — Cashfree webhook misses can leave orders stuck in `pending` paymentStatus, visible in admin.

The fix has three pillars: expand the internal status vocabulary, centralize every status update through one service, and update all UI surfaces to display the new states.

---

## Approach: Full Centralization + Expanded Statuses

### 1. Expanded Order Status Set

Current (5 states) → New (12 states):

```
pending
confirmed
processing          ← shipment created, preparing
pickup_scheduled    ← NEW: pickup queued / manifested / dispatched
shipped             ← in transit
out_for_delivery    ← NEW: out for delivery
delivered
cancelled
rto                 ← NEW: return to origin initiated
rto_delivered       ← NEW: returned to seller
lost                ← NEW
damaged             ← NEW
refunded            (existing, unchanged)
```

**File to update:** `src/lib/constants.ts`

```typescript
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

**File to update:** `src/models/Order.ts` — expand the `orderStatus` enum field to include all 12 values.

---

### 2. Corrected Provider Status Mappings

#### Shiprocket (`src/lib/shipping/shiprocket.ts` — `mapStatus()`)

| Shiprocket Status | Internal Status |
|---|---|
| PENDING | processing |
| PICKUP PENDING / PICKUP QUEUED / PICKUP RESCHEDULED / PICKUP ERROR | **pickup_scheduled** |
| MANIFESTED | processing |
| SHIPPED / IN TRANSIT | shipped |
| OUT FOR DELIVERY | **out_for_delivery** |
| DELIVERY FAILED | shipped |
| DELIVERED | delivered |
| RTO INITIATED / RTO | **rto** |
| RTO DELIVERED / RTO OUT FOR DELIVERY | **rto_delivered** |
| LOST | **lost** |
| DAMAGED | **damaged** |
| CANCELLED | cancelled |

#### Delhivery (`src/lib/shipping/delhivery.ts` — `mapStatus()`)

| Delhivery Status | Internal Status |
|---|---|
| Pending / Manifested | processing |
| Dispatched | **pickup_scheduled** |
| In Transit / Transit Delay / Misrouted | shipped |
| Out for Delivery | **out_for_delivery** |
| Delivered | delivered |
| RTO Initiated | **rto** |
| RTO / RTO Out for Delivery | **rto** |
| RTO Delivered | **rto_delivered** |
| Lost | **lost** |
| Damaged | **damaged** |
| Cancelled | cancelled |

---

### 3. Centralized Status Update Service

**New file:** `src/lib/orders/updateOrderStatus.ts`

```typescript
async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  source: 'shiprocket_webhook' | 'delhivery_webhook' | 'payment' | 'admin' | 'poll',
  meta?: { location?: string; providerStatus?: string }
): Promise<{ changed: boolean; previousStatus: OrderStatus }>
```

Responsibilities:
- Load the order
- Validate transition (no backwards movement without admin override)
- Write `Order.orderStatus` + `Order.lastStatusUpdate`
- Set `Order.deliveredAt`, `Order.cancelledAt`, `Order.refundedAt` when relevant
- Trigger notifications (email/SMS) based on transition type — notification logic removed from individual webhooks
- Return `{ changed, previousStatus }` for caller logging

**Callers to refactor (remove direct `Order.orderStatus =` assignments):**
- `src/app/api/shipping/webhook/status-update/route.ts` (Shiprocket webhook)
- `src/app/api/shipping/webhook/route.ts` (Delhivery webhook)
- `src/app/api/admin/orders/[orderId]/status/route.ts` (Admin manual update)
- `src/app/api/shipping/poll-tracking/route.ts` (Tracking poll)
- `src/app/api/payment/callback/route.ts` (Payment callback)
- `src/lib/shipping/createShipmentForOrder.ts` (Shipment creation sets processing)

---

### 4. Validation Schema Updates

**File:** `src/lib/validations/shipping.ts`

Update `VALID_SHIPMENT_STATUSES` to include all Shiprocket and Delhivery statuses we now handle. Ensures webhook validation doesn't reject legitimate status strings.

---

### 5. UI Updates

#### Customer Timeline (`src/components/orders/OrderTimeline.tsx`)

Add steps:
- `pickup_scheduled` — "Pickup Scheduled" with a calendar/clock icon
- `out_for_delivery` — "Out for Delivery" with a truck icon
- Error branch for `rto` / `rto_delivered` / `lost` / `damaged` — shown in amber/red with descriptive label

#### Admin Timeline (`src/components/admin/OrderTimelineAdmin.tsx`)

Same additions. Also show `source` label on each step (e.g., "Updated via Shiprocket webhook").

#### Shipments Table (`src/components/admin/ShipmentsTable.tsx`)

- Add `orderStatus` column alongside existing `shipmentStatus` column
- Extend filter dropdown to include `pickup_scheduled`, `out_for_delivery`, `rto`, `rto_delivered`, `lost`, `damaged`

#### Order Status Manager (`src/components/admin/OrderStatusManager.tsx`)

Extend the dropdown with the 6 new statuses so admins can manually set them.

#### Payment Status Fix

On the admin order detail page (`src/app/admin/orders/[orderId]/page.tsx`), trigger a lightweight check against the existing `/api/admin/sync/payments` for this specific order on page load if `paymentStatus === 'pending'` and order is more than 5 minutes old.

---

### 6. Database Migration Script

**New file:** `src/scripts/migrateDeliveryStatuses.ts`

Steps:
1. Find all `Shipment` documents where `shipmentStatus` is not in `{ Delivered, Cancelled, Lost, Damaged, RTO Delivered }` (non-terminal)
2. Group by `provider`
3. For each shipment, call `provider.trackShipment(providerShipmentId)` to get live status
4. Call `updateOrderStatus(orderId, mappedStatus, 'poll')` with fresh mapped status
5. Print summary: `{ total, updated, failed, skipped }`

Run via: `npx ts-node src/scripts/migrateDeliveryStatuses.ts`

---

## Critical Files

| File | Change |
|---|---|
| `src/lib/constants.ts` | Expand `ORDER_STATUS` + export `OrderStatus` type |
| `src/models/Order.ts` | Expand `orderStatus` enum |
| `src/lib/shipping/shiprocket.ts` | Fix `mapStatus()` — 6 new mappings |
| `src/lib/shipping/delhivery.ts` | Fix `mapStatus()` — 6 new mappings |
| `src/lib/orders/updateOrderStatus.ts` | **New** — centralized service |
| `src/lib/validations/shipping.ts` | Expand valid statuses |
| `src/app/api/shipping/webhook/status-update/route.ts` | Use `updateOrderStatus`, remove inline notification |
| `src/app/api/shipping/webhook/route.ts` | Use `updateOrderStatus`, remove inline notification |
| `src/app/api/admin/orders/[orderId]/status/route.ts` | Use `updateOrderStatus` |
| `src/app/api/shipping/poll-tracking/route.ts` | Use `updateOrderStatus` |
| `src/app/api/payment/callback/route.ts` | Use `updateOrderStatus` |
| `src/lib/shipping/createShipmentForOrder.ts` | Use `updateOrderStatus` |
| `src/components/orders/OrderTimeline.tsx` | Add 5 new status stages |
| `src/components/admin/OrderTimelineAdmin.tsx` | Add 5 new status stages |
| `src/components/admin/ShipmentsTable.tsx` | Add order_status column + filter entries |
| `src/components/admin/OrderStatusManager.tsx` | Add new statuses to dropdown |
| `src/app/admin/orders/[orderId]/page.tsx` | Auto-sync payment status on load |
| `src/scripts/migrateDeliveryStatuses.ts` | **New** — backfill script |

---

## Verification

1. **Unit test mapStatus()** — assert each Shiprocket/Delhivery status string maps to the correct new internal status.
2. **Webhook smoke test** — POST a fake Shiprocket `PICKUP QUEUED` webhook; verify `Order.orderStatus` becomes `pickup_scheduled`.
3. **Admin UI** — Load an order with a shipment in transit; confirm timeline shows `pickup_scheduled` and `shipped` steps correctly highlighted.
4. **Payment sync** — Load an admin order page for a `pending` payment order older than 5 min; verify sync triggers and status updates.
5. **Migration** — Run `migrateDeliveryStatuses.ts` on a staging DB; verify summary output and spot-check 3–5 orders.
