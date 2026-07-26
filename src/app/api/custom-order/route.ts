import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { createErrorResponse, Errors } from '@/lib/utils/errorHandler';
import { customOrderSchema } from '@/lib/validations/custom-order';
import CustomOrder from '@/models/CustomOrder';
import { emailService } from '@/lib/notifications/email';

export const runtime = 'nodejs';

// Custom order request: 5 per hour per IP (mail + a DB write).
const CUSTOM_ORDER_RATE_LIMIT = {
  windowMs: 3_600_000,
  maxRequests: 5,
  keyPrefix: 'custom-order:request',
};

/**
 * POST /api/custom-order
 * Public lead-capture: a customer requests a medicine we may not stock. Stores
 * the request and emails the shop. Never logs PII (phone / address) per CLAUDE.md.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await applyRateLimit(req, CUSTOM_ORDER_RATE_LIMIT);
    if (limited) return limited;

    await connectDB();

    const body = await req.json();
    const parsed = customOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw Errors.validationError(
        'Check the highlighted fields and try again',
        parsed.error.flatten()
      );
    }

    const { website, ...data } = parsed.data;

    // Honeypot tripped: pretend success, do nothing.
    if (website) {
      return NextResponse.json({ data: { received: true } }, { status: 201 });
    }

    // Normalise empty-string optionals to undefined before storing.
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as typeof data;

    const doc = await CustomOrder.create(cleaned);

    // Notify the shop. Never block the response (or leak PII) on a mail failure —
    // the request is already stored.
    try {
      await emailService.sendCustomOrder(cleaned);
    } catch {
      console.error('Custom order email failed to send (request stored).');
    }

    return NextResponse.json(
      { data: { received: true, id: doc._id.toString() } },
      { status: 201 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
