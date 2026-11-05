import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { notifyOwnerNewOrderWhatsApp } from '@/lib/notifications/owner-whatsapp';

/**
 * POST /api/admin/notifications/test-whatsapp
 *
 * Sends a single, clearly-marked SAMPLE order alert to the store WhatsApp via
 * CallMeBot so the owner can confirm, from the admin panel, that real delivery
 * works end-to-end. Admin only (role re-read from the DB — CLAUDE.md rule #4)
 * and tightly rate-limited so the button can't burn through CallMeBot's free
 * allowance. The sample carries no customer data (health-data rule #6).
 *
 * Response: `{ ok: true }` when CallMeBot accepted the message; otherwise
 * `{ ok: false, reason }` — 'not_configured' (no apikey yet) or 'send_failed'.
 */
export async function POST(request: NextRequest) {
  // 3 tests per 5 minutes per IP — enough to retry, not enough to spam the relay.
  const rateLimited = await applyRateLimit(request, {
    windowMs: 300000,
    maxRequests: 3,
    keyPrefix: 'admin:test-whatsapp',
  });
  if (rateLimited) return rateLimited;

  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  if (!process.env.CALLMEBOT_APIKEY) {
    return NextResponse.json({ ok: false, reason: 'not_configured' }, { status: 200 });
  }

  try {
    const sent = await notifyOwnerNewOrderWhatsApp({
      orderNumber: `TEST-${Date.now().toString(36).toUpperCase()}`,
      items: [{ name: 'Test alert — no action needed', quantity: 1 }],
      itemCount: 1,
      totalAmount: 0,
      paymentMethod: 'cod',
      prescriptionRequired: false,
    });

    return NextResponse.json(
      sent ? { ok: true } : { ok: false, reason: 'send_failed' },
      { status: 200 }
    );
  } catch {
    // notifyOwnerNewOrderWhatsApp never throws, but stay defensive — and never
    // surface internals to the client.
    return NextResponse.json({ ok: false, reason: 'send_failed' }, { status: 200 });
  }
}
