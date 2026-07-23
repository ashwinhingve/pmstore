import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import SavedMedicine from '@/models/SavedMedicine';
import Product from '@/models/Product';
import { saveMedicineSchema } from '@/lib/validations/saved';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

const PRODUCT_FIELDS =
  'name slug price mrp unitPrice packSize packUnit images stock prescriptionRequired scheduleClass';

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw Errors.unauthorized('Sign in to save medicines');
  return session.user.id;
}

function serialize(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const out = { ...doc };
  if (out._id) out._id = String(out._id);
  return out;
}

/** GET /api/saved — the caller's saved medicines, newest first. */
export async function GET() {
  try {
    await connectDB();
    const userId = await requireUserId();

    const saved = await SavedMedicine.find({ userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'productId', select: PRODUCT_FIELDS })
      .lean<{ _id: unknown; createdAt: Date; productId: Record<string, unknown> | null }[]>();

    const data = saved
      .filter((s) => s.productId) // product may have been removed
      .map((s) => ({ _id: String(s._id), savedAt: s.createdAt, product: serialize(s.productId) }));

    return NextResponse.json({ data });
  } catch (err) {
    return createErrorResponse(err);
  }
}

/** POST /api/saved — save a medicine. Idempotent (unique on user+product). */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await requireUserId();

    const parsed = saveMedicineSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw Errors.validationError('Choose a medicine to save', parsed.error.flatten());
    const { productId } = parsed.data;

    const exists = await Product.exists({ _id: productId, isActive: true });
    if (!exists) throw Errors.notFound('Product', productId);

    await SavedMedicine.updateOne(
      { userId, productId },
      { $setOnInsert: { userId, productId } },
      { upsert: true }
    );

    return NextResponse.json({ data: { productId, saved: true } }, { status: 201 });
  } catch (err) {
    return createErrorResponse(err);
  }
}
