/**
 * Exactly-once guard for the owner's WhatsApp order alert.
 *
 * A confirmed Cashfree order can reach the notification code twice — the browser
 * GET redirect (`/api/payment/callback`) and the server-to-server POST webhook
 * can both fire, and either can be retried. Without a guard they'd race and the
 * owner would get the same "NEW ORDER" WhatsApp twice. This claim sets a marker
 * on the order with a single atomic update: MongoDB serialises concurrent updates
 * to one document, so the condition `ownerWhatsappNotifiedAt: { $exists: false }`
 * matches for exactly one caller. Only that caller gets `true` and sends.
 *
 * Scoped to the WhatsApp owner alert only — the Telegram/email/SMS admin alerts
 * keep their existing behaviour untouched.
 */

import type mongoose from 'mongoose';
import Order from '@/models/Order';

/**
 * Atomically claim the owner WhatsApp alert for an order. Returns `true` exactly
 * once per order (the first caller to win the race), `false` for every later
 * caller and on any error — so a guard failure suppresses a possible duplicate
 * rather than risking a double-send. Never throws.
 */
export async function claimOwnerWhatsappAlert(
  orderId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  try {
    const res = await Order.updateOne(
      { _id: orderId, ownerWhatsappNotifiedAt: { $exists: false } },
      { $set: { ownerWhatsappNotifiedAt: new Date() } }
    );
    return res.modifiedCount === 1;
  } catch (err) {
    console.error(
      'Owner WhatsApp alert: claim failed:',
      err instanceof Error ? err.message : 'unknown error'
    );
    return false;
  }
}
