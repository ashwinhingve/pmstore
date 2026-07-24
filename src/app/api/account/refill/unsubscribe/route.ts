import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import User from '@/models/User';
import { verifyUnsubscribeToken } from '@/lib/notifications/unsubscribe';

/**
 * GET /api/account/refill/unsubscribe?u=<userId>&t=<token>
 *
 * One-click unsubscribe from refill reminders, straight from the email — no
 * login required. The signed token proves the link was minted for this user
 * (see lib/notifications/unsubscribe.ts), so a guessed userId can't opt someone
 * else out. Always returns a friendly HTML page, never leaks whether the user
 * exists.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u') ?? '';
  const token = req.nextUrl.searchParams.get('t') ?? '';

  let ok = false;
  if (verifyUnsubscribeToken(userId, token)) {
    try {
      await connectDB();
      await User.updateOne({ _id: userId }, { $set: { refillOptOut: true } });
      ok = true;
    } catch {
      ok = false;
    }
  }

  const message = ok
    ? "You're unsubscribed. We won't send you refill reminders anymore. You can turn them back on any time in your account settings."
    : 'This unsubscribe link is invalid or has expired. You can manage refill reminders from your account settings.';

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Refill reminders</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f6f7f6; color: #1a1a1a; margin: 0; padding: 40px 16px; }
      .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; text-align: center; }
      h1 { color: #0f766e; font-size: 20px; }
      a { color: #0f766e; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${ok ? 'Unsubscribed' : 'Something went wrong'}</h1>
      <p>${message}</p>
      <p><a href="/settings">Go to account settings</a></p>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
