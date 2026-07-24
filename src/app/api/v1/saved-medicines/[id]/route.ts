import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import SavedMedicine from '@/models/SavedMedicine';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';

export const runtime = 'nodejs';

/**
 * DELETE /api/v1/saved-medicines/[id] — unsave a medicine.
 * Bearer auth required. Only the user can unsave their own medicines.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(_req);
    if (authError) return authError;

    const userId = claims!.sub;
    const { id } = await params;

    // Delete (verify ownership via userId)
    const result = await SavedMedicine.deleteOne({ _id: id, userId });

    if (!result.deletedCount) {
      return v1Error('Saved medicine not found', 404, 'NOT_FOUND');
    }

    return v1Ok({ removed: true });
  } catch (err) {
    console.error('v1 unsave medicine error:', err);
    return v1Error('Could not remove medicine', 500, 'INTERNAL_ERROR');
  }
}
