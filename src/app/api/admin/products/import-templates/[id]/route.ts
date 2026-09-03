import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import ImportTemplate from '@/models/ImportTemplate';
import { importTemplateSchema } from '@/lib/validations/import-template';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

function toView(doc: any) {
  return {
    id: String(doc._id),
    name: doc.name,
    includedOptionalFields: doc.includedOptionalFields ?? [],
    defaultManufacturer: doc.defaultManufacturer || undefined,
    defaultSalt: doc.defaultSalt || undefined,
    columnMapping: doc.columnMapping || undefined,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

/**
 * GET /api/admin/products/import-templates/[id]
 * Fetch one saved template. Admin only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const { id } = await params;
    const doc = await ImportTemplate.findById(id).lean();
    if (!doc) throw Errors.notFound('Import template', id);

    return NextResponse.json({ data: toView(doc) });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/admin/products/import-templates/[id]
 * Rename/edit a saved template — the same field set as create. Admin only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    const body = importTemplateSchema.parse(await request.json());

    await connectDB();
    const { id } = await params;

    try {
      const doc = await ImportTemplate.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true,
      }).lean();
      if (!doc) throw Errors.notFound('Import template', id);

      return NextResponse.json({ data: toView(doc) });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw Errors.validationError(`A template named "${body.name}" already exists`);
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
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/import-templates/[id]
 * Remove a saved template. Doesn't touch any products imported with it.
 * Admin only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const { id } = await params;
    const result = await ImportTemplate.findByIdAndDelete(id).lean();
    if (!result) throw Errors.notFound('Import template', id);

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
