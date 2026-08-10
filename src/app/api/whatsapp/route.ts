import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import {
  verifyMetaSignature,
  extractIncomingTextMessages,
  sendWhatsAppText,
} from '@/lib/whatsapp/cloud-api';
import { buildReply } from '@/lib/whatsapp/replies';
import { connectDB } from '@/lib/mongodb';
import WhatsAppContact from '@/models/WhatsAppContact';

/**
 * WhatsApp Cloud API webhook.
 *
 * GET  — Meta's one-time verification handshake. Enter this URL and the same
 *        WHATSAPP_VERIFY_TOKEN in the Meta app dashboard (WhatsApp > Configuration).
 * POST — inbound messages. We verify Meta's signature over the raw body, then send
 *        a single Hindi acknowledgement — but ONLY on the sender's first message in
 *        a 24h window, so follow-ups don't get spammed with the same reply. The
 *        team then follows up personally. There is no chatbot / menu.
 *
 * Health-data rule (CLAUDE.md #6): we never log the sender number or message text,
 * and we store only a salted hash of the number (never the number itself).
 */

// Verification handshake: echo hub.challenge back when the verify token matches.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Hash a sender's number with the app secret so we can dedupe first-vs-repeat
 * messages without ever storing the raw number (CLAUDE.md rule #6).
 */
function hashNumber(from: string): string {
  const salt = process.env.WHATSAPP_APP_SECRET || 'pmstore-whatsapp';
  return createHmac('sha256', salt).update(from).digest('hex');
}

/**
 * Reply only if this is the sender's first message in the last 24h. We attempt to
 * insert their hashed number; a duplicate-key error means we already greeted them
 * (the TTL index reopens the window after 24h). Sends fail soft.
 */
async function replyIfFirstContact(from: string, text: string): Promise<void> {
  try {
    await WhatsAppContact.create({ numberHash: hashNumber(from) });
  } catch (err: any) {
    // Duplicate key (11000) → already greeted within 24h → do not reply again.
    if (err?.code === 11000) return;
    // Any other DB error: fall through and still reply, so a customer isn't ignored.
  }
  await sendWhatsAppText(from, buildReply(text));
}

export async function POST(req: NextRequest) {
  // Read the RAW body first — the signature is an HMAC over these exact bytes.
  const rawBody = await req.text();

  if (!verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  try {
    const payload: unknown = JSON.parse(rawBody);
    const messages = extractIncomingTextMessages(payload);

    if (messages.length) {
      await connectDB();

      // Collapse to one entry per sender within this batch, then reply once each
      // (and only if it's their first message in the last 24h).
      const seen = new Set<string>();
      const unique = messages.filter((m) => {
        if (seen.has(m.from)) return false;
        seen.add(m.from);
        return true;
      });

      await Promise.all(unique.map((m) => replyIfFirstContact(m.from, m.text)));
    }
  } catch (err) {
    // Log without any PII, then still return 200 so Meta does not retry-storm.
    console.error(
      'WhatsApp webhook processing error:',
      err instanceof Error ? err.message : 'unknown error'
    );
  }

  return NextResponse.json({ received: true });
}
