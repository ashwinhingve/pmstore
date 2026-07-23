import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import SavedMedicine from '@/models/SavedMedicine';
import { saveMedicineSchema } from '@/lib/validations/saved';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/** DELETE /api/saved/[productId] — unsave a medicine for the caller. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw Errors.unauthorized('Sign in to manage saved medicines');

    const { productId } = saveMedicineSchema.parse(await params);
    const res = await SavedMedicine.deleteOne({ userId: session.user.id, productId });

    return NextResponse.json({ data: { removed: res.deletedCount > 0 } });
  } catch (err) {
    return createErrorResponse(err);
  }
}
