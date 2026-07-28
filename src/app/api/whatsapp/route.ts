import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMetaSignature,
  extractIncomingTextMessages,
  sendWhatsAppText,
} from '@/lib/whatsapp/cloud-api';
import { buildReply } from '@/lib/whatsapp/replies';

/**
 * WhatsApp Cloud API webhook.
 *
 * GET  — Meta's one-time verification handshake. Enter this URL and the same
 *        WHATSAPP_VERIFY_TOKEN in the Meta app dashboard (WhatsApp > Configuration).
 * POST — inbound messages. We verify Meta's signature over the raw body, then
 *        auto-reply to each text message with a canned Hinglish answer.
 *
 * Health-data rule (CLAUDE.md #6): we never log the sender number or message text.
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

export async function POST(req: NextRequest) {
  // Read the RAW body first — the signature is an HMAC over these exact bytes.
  const rawBody = await req.text();

  if (!verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  try {
    const payload: unknown = JSON.parse(rawBody);
    const messages = extractIncomingTextMessages(payload);

    // Reply to every inbound text (status callbacks yield none). Sends fail soft.
    await Promise.all(messages.map((m) => sendWhatsAppText(m.from, buildReply(m.text))));
  } catch (err) {
    // Log without any PII, then still return 200 so Meta does not retry-storm.
    console.error(
      'WhatsApp webhook processing error:',
      err instanceof Error ? err.message : 'unknown error'
    );
  }

  return NextResponse.json({ received: true });
}
