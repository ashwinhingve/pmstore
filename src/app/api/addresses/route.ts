import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { verifyAuthentication } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Address from '@/models/Address';
import { createAddressSchema } from '@/lib/validations/address';

/**
 * GET /api/addresses
 * Get all addresses for the authenticated user.
 *
 * Auth comes ONLY from the verified session — never from a request header.
 * A previous version trusted an `x-user-id` header, which let an
 * unauthenticated caller read another user's addresses (name, phone, full
 * address) by spoofing the header (CLAUDE.md rules #4 and #6).
 */
export async function GET() {
  try {
    const auth = await verifyAuthentication();
    if (auth.error) return auth.error;
    const userId = auth.session.user.id as string;

    await connectDB();

    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    // Serialize ObjectIds to strings at the boundary.
    const serialized = addresses.map((a) => ({
      ...a,
      _id: String(a._id),
      userId: String(a.userId),
    }));

    return NextResponse.json(serialized, { status: 200 });
  } catch (error) {
    console.error('Get addresses error');
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addresses
 * Create a new address for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthentication();
    if (auth.error) return auth.error;
    const userId = auth.session.user.id as string;

    const data = createAddressSchema.parse(await req.json());

    await connectDB();

    // If this is set as default, unset other defaults first.
    if (data.isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    // The first address a user saves is always the default.
    const addressCount = await Address.countDocuments({ userId });
    const isDefault = addressCount === 0 ? true : data.isDefault ?? false;

    const address = await Address.create({
      userId,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || '',
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || 'India',
      type: data.type || 'shipping',
      isDefault,
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid address' },
        { status: 400 }
      );
    }
    console.error('Create address error');
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500 }
    );
  }
}
