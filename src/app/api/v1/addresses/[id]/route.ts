import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Address from '@/models/Address';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { updateAddressSchema } from '@/lib/validations/address';

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
 * PATCH /api/v1/addresses/[id] — update an address the user owns.
 * Setting isDefault clears the flag on the user's other addresses.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return v1Error(
        parsed.error.issues[0]?.message || 'Check the address fields',
        400,
        'VALIDATION_ERROR'
      );
    }
    const input = parsed.data;

    const address = await Address.findOne({ _id: id, userId });
    if (!address) return v1Error('Address not found', 404, 'NOT_FOUND');

    if (input.isDefault && !address.isDefault) {
      await Address.updateMany(
        { userId, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    // Apply only the provided fields.
    for (const key of [
      'fullName', 'phoneNumber', 'addressLine1', 'addressLine2',
      'city', 'state', 'postalCode', 'country', 'type', 'isDefault',
    ] as const) {
      if (input[key] !== undefined) (address as any)[key] = input[key];
    }

    await address.save();

    return v1Ok({ address: shapeAddress(address.toObject()) });
  } catch (err) {
    console.error('v1 update address error:', err);
    return v1Error('Could not update address', 500, 'INTERNAL_ERROR');
  }
}

/**
 * DELETE /api/v1/addresses/[id] — remove an address the user owns.
 * If it was the default, promotes another address to default.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;
    const { id } = await params;

    const address = await Address.findOne({ _id: id, userId });
    if (!address) return v1Error('Address not found', 404, 'NOT_FOUND');

    if (address.isDefault) {
      const another = await Address.findOne({ userId, _id: { $ne: id } });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    await Address.deleteOne({ _id: id });

    return v1Ok({ removed: true });
  } catch (err) {
    console.error('v1 delete address error:', err);
    return v1Error('Could not remove address', 500, 'INTERNAL_ERROR');
  }
}
