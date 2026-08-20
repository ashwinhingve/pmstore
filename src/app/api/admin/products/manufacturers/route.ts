import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import ManufacturerCatalog from '@/models/ManufacturerCatalog';
import { manufacturerCatalogSchema } from '@/lib/validations/manufacturer-catalog';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/products/manufacturers
 * List the admin-added manufacturer catalogue (names only) for the product-form
 * autocomplete. Admin only.
 */
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const docs = await ManufacturerCatalog.find()
      .select('name')
      .sort({ nameLower: 1 })
      .lean<{ name: string }[]>();

    return NextResponse.json({ manufacturers: docs.map((d) => d.name) });
  } catch (error) {
    console.error('❌ Error listing manufacturers:', error);
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/products/manufacturers
 * Add a manufacturer name to the catalogue so it appears in the dropdown next
 * time. Idempotent: a name already in the catalogue succeeds without creating a
 * duplicate. Admin only.
 */
export async function POST(req: Request) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { name } = manufacturerCatalogSchema.parse(await req.json());

    await connectDB();

    try {
      const doc = await ManufacturerCatalog.create({ name });
      return NextResponse.json({ manufacturer: doc.name }, { status: 201 });
    } catch (err: any) {
      // Concurrent/repeat add of the same name — treat as success (idempotent).
      if (err?.code === 11000) {
        const existing = await ManufacturerCatalog.findOne({ nameLower: name.toLowerCase() })
          .select('name')
          .lean<{ name: string } | null>();
        return NextResponse.json({ manufacturer: existing?.name ?? name, existed: true });
      }
      throw err;
    }
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues ?? error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Error adding manufacturer:', error);
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/manufacturers
 * Remove an admin-added manufacturer from the catalogue so it stops appearing in
 * the dropdown. Products keep their stored manufacturer untouched. Admin only.
 */
export async function DELETE(req: Request) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { name } = manufacturerCatalogSchema.parse(await req.json());

    await connectDB();
    const result = await ManufacturerCatalog.deleteOne({ nameLower: name.toLowerCase() });

    return NextResponse.json({ deleted: result.deletedCount > 0, manufacturer: name });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues ?? error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Error deleting manufacturer:', error);
    return createErrorResponse(error);
  }
}
