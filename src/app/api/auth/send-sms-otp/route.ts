import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Otp from '@/models/Otp';
import { smsService } from '@/lib/notifications/sms';

// In-memory rate limiting: phone -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + 60 * 1000 });
    return false;
  }

  if (entry.count >= 3) {
    return true;
  }

  entry.count++;
  return false;
}

// Accept 10-digit Indian mobile numbers (with or without +91 / 0 prefix)
const PHONE_REGEX = /^(?:\+91|91|0)?([6-9]\d{9})$/;

function normalizePhone(phone: string): string | null {
  const match = phone.trim().replace(/\s/g, '').match(PHONE_REGEX);
  return match ? match[1] : null; // return 10-digit number without prefix
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { message: 'Please enter a valid mobile number.' },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json(
        { message: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    if (isRateLimited(normalized)) {
      return NextResponse.json({ message: 'OTP sent. Please wait before requesting again.' });
    }

    await connectDB();

    // Delete any existing OTPs for this phone number
    await Otp.deleteMany({ phoneNumber: normalized });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash the OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Store in MongoDB
    await Otp.create({
      phoneNumber: normalized,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send OTP via SMS
    const smsResult = await smsService.sendOtpSMS(normalized, otp);
    if (!smsResult.success) {
      throw new Error(`SMS delivery failed: ${JSON.stringify(smsResult.error)}`);
    }

    return NextResponse.json({ message: 'OTP sent to your mobile number.' });
  } catch (error: any) {
    console.error('Send SMS OTP error:', error);
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ message: error?.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ message: 'OTP sent to your mobile number.' });
  }
}
