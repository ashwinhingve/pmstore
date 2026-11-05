/**
 * Owner order alert on WhatsApp — via CallMeBot (free relay).
 *
 * When an order is confirmed the shop owner gets a WhatsApp message on his
 * personal phone with what he needs to START PREPARING the order. This is an
 * ADDITIONAL channel — the Telegram/email/SMS admin alerts (see
 * `whatsapp.ts`, `email.ts`, `sms.ts`) stay the reliable backbone, since
 * CallMeBot is a free third-party service that can be slow or rate-limited.
 *
 * Setup (one-time, owner's phone): add +34 644 51 95 23 to contacts, WhatsApp
 * it "I allow callmebot to send me messages", then set the returned apikey.
 *   CALLMEBOT_APIKEY   the key CallMeBot replies with — the only REQUIRED var
 *   CALLMEBOT_PHONE    optional override; defaults to the store WhatsApp number
 *                      (CONTACT_WHATSAPP_DIGITS — the SAME number the homepage
 *                      corner button uses), so the alert lands on that number.
 * Unset the apikey and the channel self-disables (the other alerts are unaffected).
 *
 * Health-data rule (CLAUDE.md #6): CallMeBot relays the text through a third
 * party, so the message carries NO customer name, phone or address — only what
 * the owner needs to pick/pack, plus a link to the admin page where the
 * delivery details sit securely behind login. Never log the phone or the URL
 * (it holds the number and apikey); log a status code only.
 */

import { CONTACT_WHATSAPP_DIGITS } from '@/lib/constants';

/** Max line items to spell out before collapsing to a "+N more" summary. */
const MAX_ITEMS = 30;

export interface OwnerOrderAlert {
  orderNumber: string;
  items: { name: string; quantity: number }[];
  itemCount: number;
  totalAmount: number;
  /** Order.paymentMethod — 'cod' | 'card' | 'upi' | 'netbanking' | 'wallet'. */
  paymentMethod: string;
  prescriptionRequired: boolean;
}

/**
 * Build the WhatsApp message text. Pure and deterministic (no env, no I/O) so
 * it is unit-testable. Deliberately contains no customer PII — see the file
 * header. `adminUrl` is the app origin (no trailing slash expected).
 */
export function buildOwnerOrderMessage(order: OwnerOrderAlert, adminUrl: string): string {
  const payment = order.paymentMethod === 'cod' ? 'COD (collect cash)' : 'Online (paid)';

  const lines: string[] = [];
  lines.push(`🧾 NEW ORDER  ${order.orderNumber}`);
  lines.push(`Payment: ${payment} · ₹${order.totalAmount.toFixed(2)}`);
  lines.push(
    order.prescriptionRequired
      ? 'Rx required: Yes — verify prescription'
      : 'Rx required: No'
  );

  lines.push(`Items to prepare (${order.itemCount}):`);
  const shown = order.items.slice(0, MAX_ITEMS);
  for (const item of shown) {
    lines.push(`• ${item.name} ×${item.quantity}`);
  }
  const remaining = order.items.length - shown.length;
  if (remaining > 0) {
    lines.push(`• …+${remaining} more`);
  }

  lines.push(`Full details: ${adminUrl}/admin/orders`);

  return lines.join('\n');
}

/**
 * Send the owner's order alert via CallMeBot. Fails soft (logs a status, never
 * the phone/URL) so a relay hiccup never throws out of the order flow. Returns
 * true on a successful send.
 */
export async function notifyOwnerNewOrderWhatsApp(order: OwnerOrderAlert): Promise<boolean> {
  // Recipient defaults to the store WhatsApp number (same as the homepage corner
  // button); CALLMEBOT_PHONE only overrides it. The apikey is the one secret
  // CallMeBot hands out, so it alone gates whether the channel is configured.
  const phone = process.env.CALLMEBOT_PHONE || CONTACT_WHATSAPP_DIGITS;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!apikey) {
    console.warn('Owner WhatsApp alert not configured — set CALLMEBOT_APIKEY');
    return false;
  }

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
  const text = buildOwnerOrderMessage(order, adminUrl);

  const url =
    'https://api.callmebot.com/whatsapp.php' +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(apikey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    if (!res.ok) {
      // Status only — the URL carries the phone number and apikey. Health-data rule.
      console.error(`Owner WhatsApp alert failed with status ${res.status}`);
      return false;
    }
    // CallMeBot answers 200 even for soft failures (bad/expired apikey, number
    // not registered), so HTTP status alone isn't proof of delivery. Its accepted
    // responses say the message was "queued"/"sent"/"will receive it"; anything
    // else is a failure. The body echoes the phone number, so NEVER log it —
    // only a generic line (health-data rule).
    const body = await res.text();
    const accepted = /queued|will receive|\bsent\b|message to/i.test(body);
    if (!accepted) {
      console.error('Owner WhatsApp alert: CallMeBot did not accept the message (check apikey/number registration)');
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      'Owner WhatsApp alert error:',
      err instanceof Error ? err.message : 'unknown error'
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
