import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Address from '@/models/Address';

/**
 * PUT /api/addresses/:id
 * Update an address (only if it belongs to the authenticated user)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    // Find address and verify ownership
    const address = await Address.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // If setting as default, unset other default addresses
    if (body.isDefault && !address.isDefault) {
      await Address.updateMany(
        { userId: session.user.id, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    // Update fields
    if (body.fullName) address.fullName = body.fullName;
    if (body.phoneNumber) address.phoneNumber = body.phoneNumber;
    if (body.addressLine1) address.addressLine1 = body.addressLine1;
    if (body.addressLine2 !== undefined) address.addressLine2 = body.addressLine2;
    if (body.city) address.city = body.city;
    if (body.state) address.state = body.state;
    if (body.postalCode) address.postalCode = body.postalCode;
    if (body.country) address.country = body.country;
    if (body.type) address.type = body.type;
    if (body.isDefault !== undefined) address.isDefault = body.isDefault;

    await address.save();

    return NextResponse.json(address, { status: 200 });
  } catch (error: any) {
    console.error('❌ Update address error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update address',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/addresses/:id
 * Delete an address (only if it belongs to the authenticated user)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    // Find address and verify ownership
    const address = await Address.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // If this was the default address, set another as default
    if (address.isDefault) {
      const anotherAddress = await Address.findOne({
        userId: session.user.id,
        _id: { $ne: id },
      });

      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    await Address.deleteOne({ _id: id });

    return NextResponse.json(
      { message: 'Address deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Delete address error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete address',
        details: error.message
      },
      { status: 500 }
    );
  }
}
