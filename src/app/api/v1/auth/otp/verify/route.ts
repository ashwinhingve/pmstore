import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Otp from '@/models/Otp';
import User from '@/models/User';
import { signTokenPair } from '@/lib/mobile/token';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTEMPTS = 5;

/**
 * POST /api/v1/auth/otp/verify  { email, otp }
 *
 * Verifies the emailed OTP and logs the mobile app in: finds or creates the
 * user, then returns a fresh access+refresh pair carrying the user's current
 * mobileTokenVersion. The OTP is single-use (deleted on success) and rate-
 * limited by an attempt counter to blunt brute force.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json().catch(() => ({}));
    if (!email || !EMAIL_REGEX.test(email) || !otp) {
      return v1Error('Email and OTP are required.', 400, 'INVALID_INPUT');
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    await connectDB();

    const record = await Otp.findOne({ email: normalizedEmail });
    if (!record) return v1Error('OTP expired or not found. Request a new one.', 400, 'OTP_NOT_FOUND');

    if (record.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: record._id });
      return v1Error('Too many attempts. Request a new OTP.', 429, 'TOO_MANY_ATTEMPTS');
    }

    const matches = await bcrypt.compare(String(otp), record.otp);
    if (!matches) {
      await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return v1Error('Incorrect OTP.', 400, 'OTP_MISMATCH');
    }

    // Correct — burn the OTP so it can't be replayed.
    await Otp.deleteOne({ _id: record._id });

    // Find or create the user. save() (not updateOne) so hooks/defaults run.
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({ email: normalizedEmail, provider: 'email', emailVerified: true });
      await user.save();
    }

    const { accessToken, refreshToken } = signTokenPair(
      String(user._id),
      user.role,
      user.mobileTokenVersion ?? 0
    );

    return v1Ok({
      accessToken,
      refreshToken,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.fullName ?? user.name ?? null,
        role: user.role,
      },
    });
  } catch {
    return v1Error('Could not verify OTP. Please try again.', 500, 'VERIFY_FAILED');
  }
}
