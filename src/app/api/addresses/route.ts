import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Address from '@/models/Address';

/**
 * GET /api/addresses
 * Get all addresses for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    let userId = req.headers.get('x-user-id') || null;
    if (!userId || userId === 'undefined') {
      userId = null;
      try {
        const session = await getServerSession(authOptions);
        userId = session?.user?.id ?? null;
      } catch {
        // getServerSession can throw when NEXTAUTH_URL doesn't match origin
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 });

    return NextResponse.json(addresses, { status: 200 });
  } catch (error) {
    console.error('❌ Get addresses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addresses
 * Create a new address for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    let userId = req.headers.get('x-user-id') || null;
    if (!userId || userId === 'undefined') {
      userId = null;
      try {
        const session = await getServerSession(authOptions);
        userId = session?.user?.id ?? null;
      } catch {
        // getServerSession can throw when NEXTAUTH_URL doesn't match origin
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = ['fullName', 'phoneNumber', 'addressLine1', 'city', 'state', 'postalCode'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate phone number (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(body.phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be 10 digits starting with 6-9' },
        { status: 400 }
      );
    }

    // Validate PIN code (Indian format)
    const pinRegex = /^\d{6}$/;
    if (!pinRegex.test(body.postalCode)) {
      return NextResponse.json(
        { error: 'Invalid PIN code. Must be 6 digits' },
        { status: 400 }
      );
    }

    await connectDB();

    // If this is set as default, unset other default addresses
    if (body.isDefault) {
      await Address.updateMany(
        { userId: userId },
        { $set: { isDefault: false } }
      );
    }

    // If this is the first address, make it default
    const addressCount = await Address.countDocuments({ userId: userId });
    const isDefault = addressCount === 0 ? true : (body.isDefault || false);

    const address = await Address.create({
      userId: userId,
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2 || '',
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country || 'India',
      type: body.type || 'shipping',
      isDefault,
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error: any) {
    console.error('❌ Create address error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create address',
        details: error.message
      },
      { status: 500 }
    );
  }
}
