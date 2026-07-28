/**
 * WhatsApp Cloud API client + webhook helpers.
 *
 * This talks directly to Meta's Graph API — no paid third-party BSP. Replying to a
 * customer who messaged first is free (24-hour service window), so an auto-reply
 * support bot costs ~₹0/month in messaging.
 *
 * Required environment variables (all from the Meta app dashboard):
 *   WHATSAPP_ACCESS_TOKEN     permanent token from a Meta system user
 *   WHATSAPP_PHONE_NUMBER_ID  from WhatsApp > API setup
 *   WHATSAPP_APP_SECRET       Meta app > Settings > Basic (used to verify webhooks)
 *   WHATSAPP_VERIFY_TOKEN     any secret string you choose; also entered in the
 *                             webhook config in the Meta dashboard
 *   WHATSAPP_GRAPH_VERSION    optional; defaults below. Set to the version shown
 *                             in your dashboard if Meta deprecates the default.
 *
 * Health-data rule (CLAUDE.md #6): never log phone numbers or message contents.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_GRAPH_VERSION = 'v21.0';

/**
 * Verify that a webhook POST genuinely came from Meta. The `X-Hub-Signature-256`
 * header is `sha256=<hex>` where the HMAC is computed over the EXACT raw request
 * body using the app secret — so the caller must pass the unparsed body string.
 *
 * Mirrors the Delhivery webhook's approach: hard-require the secret in production,
 * allow through in development (with a warning) so local testing isn't blocked.
 */
export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WHATSAPP_APP_SECRET is required in production');
    }
    console.warn(
      'SECURITY WARNING: WHATSAPP_APP_SECRET not set — accepting webhook without signature check (development only).'
    );
    return true;
  }

  if (!header || !header.startsWith('sha256=')) return false;

  const provided = header.slice('sha256='.length);
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface IncomingTextMessage {
  /** Sender's WhatsApp id (a phone number in international format). Never log it. */
  from: string;
  text: string;
}

/**
 * Pull the inbound TEXT messages out of a Meta webhook payload, defensively.
 * Status callbacks (sent/delivered/read) and non-text messages are ignored, so
 * this returns an empty array for anything we don't auto-reply to.
 */
export function extractIncomingTextMessages(payload: unknown): IncomingTextMessage[] {
  const out: IncomingTextMessage[] = [];
  if (!isRecord(payload)) return out;

  const entries = payload.entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const changes = entry.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!isRecord(change)) continue;
      const value = change.value;
      if (!isRecord(value)) continue;
      const messages = value.messages;
      if (!Array.isArray(messages)) continue;

      for (const message of messages) {
        if (!isRecord(message)) continue;
        const from = typeof message.from === 'string' ? message.from : '';
        const type = typeof message.type === 'string' ? message.type : '';
        if (!from || type !== 'text') continue;

        const textObj = message.text;
        const body = isRecord(textObj) && typeof textObj.body === 'string' ? textObj.body : '';
        if (!body) continue;

        out.push({ from, text: body });
      }
    }
  }

  return out;
}

/**
 * Send a plain-text WhatsApp message via the Cloud API. Returns true on success.
 * Fails soft (logs a status, never the recipient number) so a delivery hiccup
 * never throws out of the webhook.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      'WhatsApp Cloud API not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID'
    );
    return false;
  }

  const version = process.env.WHATSAPP_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Status only — do NOT log `to` (phone number) or the response body, which
      // can echo the recipient. Health-data rule.
      console.error(`WhatsApp send failed with status ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('WhatsApp send error:', err instanceof Error ? err.message : 'unknown error');
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
