import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Otp from '@/models/Otp';
import { emailService } from '@/lib/notifications/email';

// In-memory rate limiting: email -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 60 * 1000 });
    return false;
  }

  if (entry.count >= 3) {
    return true;
  }

  entry.count++;
  return false;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isRateLimited(normalizedEmail)) {
      // Always return 200 to prevent enumeration
      return NextResponse.json({ message: 'If this email is valid, you will receive an OTP shortly.' });
    }

    await connectDB();

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email: normalizedEmail });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash the OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Store in MongoDB
    await Otp.create({
      email: normalizedEmail,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send OTP via email
    await emailService.sendOtp(normalizedEmail, otp);

    return NextResponse.json({ message: 'If this email is valid, you will receive an OTP shortly.' });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ message: error?.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ message: 'If this email is valid, you will receive an OTP shortly.' });
  }
}
