import { NextRequest } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Otp from '@/models/Otp';
import { emailService } from '@/lib/notifications/email';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RATE_LIMIT = { windowMs: 60_000, maxRequests: 3, keyPrefix: 'v1:otp:request' };

/**
 * POST /api/v1/auth/otp/request  { email }
 *
 * Mobile counterpart of /api/auth/send-otp: email OTP only. Phone OTP is
 * deferred (needs DLT registration — see CLAUDE.md scope guard). Always answers
 * with the same success message so it can't be used to enumerate accounts.
 */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, OTP_RATE_LIMIT);
  if (limited) return limited;

  const genericOk = v1Ok({ message: 'If this email is valid, an OTP has been sent.' });

  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email || !EMAIL_REGEX.test(email)) {
      return v1Error('Please provide a valid email address.', 400, 'INVALID_EMAIL');
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    await connectDB();
    await Otp.deleteMany({ email: normalizedEmail });

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, await bcrypt.genSalt(10));

    await Otp.create({
      email: normalizedEmail,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await emailService.sendOtp(normalizedEmail, otp);
    return genericOk;
  } catch {
    // Never reveal internal errors on an auth entrypoint.
    return genericOk;
  }
}
