import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import SiteSettings from '@/models/SiteSettings';
import Product from '@/models/Product';
import { productSliderSchema } from '@/lib/validations/product-slider';
import { createErrorResponse } from '@/lib/utils/errorHandler';

const VALID_SLOTS = ['featured', 'otc'] as const;
type SlotType = (typeof VALID_SLOTS)[number];

function isValidSlot(slot: string): slot is SlotType {
  return VALID_SLOTS.includes(slot as SlotType);
}

/**
 * GET /api/admin/products/sliders/[slot]
 * Fetch the curated product list for a slider slot (featured/otc).
 * Returns resolved product summaries (name, manufacturer, price, etc.) in stored order.
 * Silently drops deleted/inactive products from the list.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { slot } = await params;

  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }

  try {
    await connectDB();

    const settings = await SiteSettings.findOne({ key: 'global' }).lean();
    const productIds = (settings as any)?.productSliders?.[slot]?.productIds || [];

    if (!productIds || productIds.length === 0) {
      return NextResponse.json({ products: [], productIds: [] });
    }

    // Fetch products preserving the stored order, selecting only needed fields
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
      isDiscontinued: false,
    })
      .select('_id name manufacturer price unitPrice images slug form category')
      .lean();

    // Map to a fast lookup
    const productsById = new Map(products.map((p: any) => [String(p._id), p]));

    // Preserve order from productIds, dropping any that are missing or inactive
    const resolved = productIds
      .map((id: any) => productsById.get(String(id)))
      .filter((p: any): p is any => p !== undefined)
      .map((p: any) => ({
        _id: String(p._id),
        name: p.name,
        manufacturer: p.manufacturer,
        price: p.price,
        unitPrice: p.unitPrice,
        slug: p.slug,
        images: p.images || [],
        form: p.form,
        category: p.category,
      }));

    return NextResponse.json({ products: resolved, productIds: productIds.map(String) });
  } catch (error: any) {
    console.error(`❌ Error fetching slider products (${slot}):`, error);
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/admin/products/sliders/[slot]
 * Update the curated product list for a slider slot (featured/otc).
 * Accepts an ordered list of product IDs, validates them, and persists.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  const { slot } = await params;

  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validated = productSliderSchema.parse(body);

    await connectDB();

    // Verify all products exist and are active
    const products = await Product.find({
      _id: { $in: validated.productIds },
      isActive: true,
      isDiscontinued: false,
    })
      .select('_id')
      .lean();

    const foundIds = new Set(products.map((p: any) => String(p._id)));
    const validIds = validated.productIds.filter((id) => foundIds.has(id));

    // Update settings, creating the productSliders structure if it doesn't exist
    const settings = await SiteSettings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          [`productSliders.${slot}.productIds`]: validIds,
        },
      },
      { new: true, upsert: true }
    ).lean();

    // Revalidate homepage so changes appear immediately
    revalidatePath('/');

    // Fetch and return the resolved products
    const resolvedProducts = await Product.find({
      _id: { $in: validIds },
      isActive: true,
      isDiscontinued: false,
    })
      .select('_id name manufacturer price unitPrice images slug form category')
      .lean();

    const productsById = new Map(resolvedProducts.map((p: any) => [String(p._id), p]));
    const resolved = validIds
      .map((id) => productsById.get(id))
      .filter((p: any): p is any => p !== undefined)
      .map((p: any) => ({
        _id: String(p._id),
        name: p.name,
        manufacturer: p.manufacturer,
        price: p.price,
        unitPrice: p.unitPrice,
        slug: p.slug,
        images: p.images || [],
        form: p.form,
        category: p.category,
      }));

    return NextResponse.json({ products: resolved, productIds: validIds });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues ?? error.errors },
        { status: 400 }
      );
    }
    console.error(`❌ Error updating slider products (${slot}):`, error);
    return createErrorResponse(error);
  }
}
