/**
 * Turning a delivered order into scheduled refill reminders.
 *
 * The pure builder here decides *which* lines earn a reminder and *when* it's
 * due; the DB shell (scheduleRefillRemindersForOrder) persists them. Splitting
 * it this way keeps the eligibility + timing rules unit-testable without a
 * database, and keeps this module free of any dependency on the Week-4 order
 * delivery handler — that handler (or a backfill script) just calls the shell.
 */
import { computeDueAt } from '@/lib/pharma/refill';

/** A delivered order line, reduced to what refill scheduling needs. */
export interface DeliveredLine {
  orderItemId: string;
  productId: string;
  quantity: number;
}

/** Current pack size per product, for the supply calculation. */
export interface RefillProduct {
  packSize: number;
}

export interface ReminderDoc {
  userId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  dueAt: Date;
}

/**
 * Build reminder docs for the eligible lines of one delivered order. A line is
 * skipped when its product is unknown or its supply can't be estimated (missing
 * pack size / quantity) — computeDueAt returns null and we simply don't schedule.
 */
export function buildReminderDocs(
  userId: string,
  orderId: string,
  deliveredAt: Date,
  lines: DeliveredLine[],
  productsById: Record<string, RefillProduct>
): ReminderDoc[] {
  const docs: ReminderDoc[] = [];
  for (const line of lines) {
    const product = productsById[line.productId];
    if (!product) continue;

    const dueAt = computeDueAt(deliveredAt, product.packSize, line.quantity);
    if (!dueAt) continue;

    docs.push({
      userId,
      orderId,
      orderItemId: line.orderItemId,
      productId: line.productId,
      dueAt,
    });
  }
  return docs;
}

/**
 * Persist reminders for a delivered order, one per line, idempotently. Safe to
 * call more than once: the unique `orderItemId` index means a re-run inserts
 * nothing new (upsert with $setOnInsert). Requires a live DB — call from the
 * order-delivered handler or a backfill script, never at import time.
 */
export async function scheduleRefillRemindersForOrder(orderId: string): Promise<number> {
  // Imported lazily so this module stays require-safe for the pure builder tests.
  const connectDB = (await import('@/lib/mongodb/connection')).default;
  const Order = (await import('@/models/Order')).default;
  const OrderItem = (await import('@/models/OrderItem')).default;
  const Product = (await import('@/models/Product')).default;
  const RefillReminder = (await import('@/models/RefillReminder')).default;

  await connectDB();

  const order = await Order.findById(orderId)
    .select('userId deliveredAt orderStatus')
    .lean<{ userId: unknown; deliveredAt?: Date; orderStatus?: string } | null>();
  if (!order || order.orderStatus !== 'delivered') return 0;

  const deliveredAt = order.deliveredAt ?? new Date();

  const items = await OrderItem.find({ orderId })
    .select('productId quantity')
    .lean<Array<{ _id: unknown; productId: unknown; quantity: number }>>();
  if (!items.length) return 0;

  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } })
    .select('packSize')
    .lean<Array<{ _id: unknown; packSize: number }>>();
  const productsById: Record<string, RefillProduct> = {};
  for (const p of products) productsById[String(p._id)] = { packSize: p.packSize };

  const docs = buildReminderDocs(
    String(order.userId),
    orderId,
    deliveredAt,
    items.map((i) => ({
      orderItemId: String(i._id),
      productId: String(i.productId),
      quantity: i.quantity,
    })),
    productsById
  );
  if (!docs.length) return 0;

  const ops = docs.map((d) => ({
    updateOne: {
      filter: { orderItemId: d.orderItemId },
      update: { $setOnInsert: d },
      upsert: true,
    },
  }));

  const res = await RefillReminder.bulkWrite(ops, { ordered: false });
  return (res.upsertedCount as number) ?? 0;
}
