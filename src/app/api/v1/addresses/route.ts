import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Address from '@/models/Address';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { createAddressSchema } from '@/lib/validations/address';

export const runtime = 'nodejs';

/** Lean shape for the client — _id as a string, no Mongoose internals. */
function shapeAddress(a: Record<string, any>) {
  return {
    _id: String(a._id),
    type: a.type,
    fullName: a.fullName,
    phoneNumber: a.phoneNumber,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 || '',
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    isDefault: a.isDefault,
  };
}

/**
 * GET /api/v1/addresses — list the user's addresses (default first).
 * Bearer auth required. Mirrors the web /api/addresses logic.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;

    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean<Record<string, any>[]>();

    return v1Ok({ addresses: addresses.map(shapeAddress) });
  } catch (err) {
    console.error('v1 addresses list error:', err);
    return v1Error('Could not fetch addresses', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/v1/addresses — add an address.
 * Bearer auth required. First address is forced default; setting isDefault
 * clears the others.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const body = await req.json().catch(() => null);
    const parsed = createAddressSchema.safeParse(body);
    if (!parsed.success) {
      return v1Error(
        parsed.error.issues[0]?.message || 'Check the address fields',
        400,
        'VALIDATION_ERROR'
      );
    }
    const input = parsed.data;

    // First address is always default; otherwise honour the flag and clear others.
    const count = await Address.countDocuments({ userId });
    const isDefault = count === 0 ? true : !!input.isDefault;
    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const address = await Address.create({
      userId,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || '',
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country || 'India',
      type: input.type || 'shipping',
      isDefault,
    });

    return v1Ok({ address: shapeAddress(address.toObject()) }, 201);
  } catch (err) {
    console.error('v1 create address error:', err);
    return v1Error('Could not save address', 500, 'INTERNAL_ERROR');
  }
}
