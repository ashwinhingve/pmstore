import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { createErrorResponse, Errors } from '@/lib/utils/errorHandler';
import { wholesaleEnquirySchema } from '@/lib/validations/wholesale';
import WholesaleEnquiry from '@/models/WholesaleEnquiry';
import { emailService } from '@/lib/notifications/email';

export const runtime = 'nodejs';

// Wholesale enquiry: 5 per hour per IP (mail + a DB write).
const WHOLESALE_RATE_LIMIT = {
  windowMs: 3_600_000,
  maxRequests: 5,
  keyPrefix: 'wholesale:enquiry',
};

/**
 * POST /api/wholesale
 * Public lead-capture form. Stores the enquiry and emails the shop.
 * Never logs PII (phone / address) per CLAUDE.md.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await applyRateLimit(req, WHOLESALE_RATE_LIMIT);
    if (limited) return limited;

    await connectDB();

    const body = await req.json();
    const parsed = wholesaleEnquirySchema.safeParse(body);
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

    // Normalise empty optionals to undefined before storing.
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as typeof data;

    const doc = await WholesaleEnquiry.create(cleaned);

    // Notify the shop. Never block the response (or leak PII) on a mail failure —
    // the enquiry is already stored.
    try {
      await emailService.sendWholesaleEnquiry(cleaned);
    } catch {
      console.error('Wholesale enquiry email failed to send (enquiry stored).');
    }

    return NextResponse.json(
      { data: { received: true, id: doc._id.toString() } },
      { status: 201 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
