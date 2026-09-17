import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Supplier from '@/models/Supplier';
import { supplierSchema } from '@/lib/validations/supplier';
import { handleInventoryError } from '@/lib/inventory/api-error';

/**
 * GET /api/admin/inventory/suppliers
 * List suppliers (paginated + searchable). `?active=true` returns every active
 * supplier for form dropdowns.
 */
export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    // Dropdown mode — all active suppliers, name-sorted, no pagination.
    if (searchParams.get('active') === 'true') {
      const suppliers = await Supplier.find({ isActive: true })
        .select('name gstin phone paymentTerms')
        .sort({ name: 1 })
        .limit(500)
        .lean();
      return NextResponse.json({ data: suppliers });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // active | inactive | all

    const query: Record<string, unknown> = {};
    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Supplier.countDocuments(query),
    ]);

    return NextResponse.json({
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return handleInventoryError(err);
  }
}

/**
 * POST /api/admin/inventory/suppliers
 * Create a supplier. nameLower is derived in the model; a case-variant duplicate
 * is rejected with a 409-style ALREADY_EXISTS.
 */
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const validated = supplierSchema.parse(await req.json());
    await connectDB();
    const supplier = await Supplier.create(validated);
    return NextResponse.json({ data: supplier }, { status: 201 });
  } catch (err) {
    return handleInventoryError(err);
  }
}
