import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import connectDB from '@/lib/mongodb/connection';
import RefillReminder from '@/models/RefillReminder';
import User from '@/models/User';
import Product from '@/models/Product';
import { emailService } from '@/lib/notifications/email';
import { unsubscribeUrl } from '@/lib/notifications/unsubscribe';

/**
 * POST /api/cron/refill-reminders
 *
 * Called daily by .github/workflows/cron.yml (09:00 IST) with
 * `Authorization: Bearer <CRON_SECRET>`. Sends every reminder that has come due
 * and flips it to 'sent'; skips (cancels) customers who've opted out.
 *
 * Health-data note (CLAUDE.md rule #6): we NEVER log the medicine name, the
 * recipient email, or any address. Only opaque counts and reminder ids.
 */

const BATCH_LIMIT = 200;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const due = await RefillReminder.find({ status: 'scheduled', dueAt: { $lte: now } })
    .sort({ dueAt: 1 })
    .limit(BATCH_LIMIT)
    .lean<Array<{ _id: unknown; userId: unknown; productId: unknown }>>();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of due) {
    try {
      const [user, product] = await Promise.all([
        User.findById(reminder.userId).select('email refillOptOut').lean<{ email?: string; refillOptOut?: boolean } | null>(),
        Product.findById(reminder.productId).select('name slug').lean<{ name?: string; slug?: string } | null>(),
      ]);

      // Opted out, no email, or product gone — cancel so we don't retry forever.
      if (!user?.email || user.refillOptOut || !product?.slug) {
        await RefillReminder.updateOne({ _id: reminder._id }, { $set: { status: 'cancelled' } });
        skipped++;
        continue;
      }

      const result = await emailService.sendRefillReminder(
        user.email,
        product.name ?? 'your medicine',
        `${baseUrl}/products/${product.slug}`,
        unsubscribeUrl(String(reminder.userId), baseUrl)
      );

      if (result?.success) {
        await RefillReminder.updateOne(
          { _id: reminder._id },
          { $set: { status: 'sent', sentAt: new Date() } }
        );
        sent++;
      } else {
        failed++; // leave 'scheduled' so the next run retries
      }
    } catch (err) {
      failed++;
      // Log the id only — never the medicine, email, or address.
      console.error('refill-reminder send failed for', String(reminder._id), err instanceof Error ? err.message : '');
    }
  }

  return NextResponse.json({ data: { processed: due.length, sent, skipped, failed } });
}
