import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import ImportTemplate from '@/models/ImportTemplate';
import { importTemplateSchema } from '@/lib/validations/import-template';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

interface ImportTemplateView {
  id: string;
  name: string;
  includedOptionalFields: string[];
  defaultManufacturer?: string;
  defaultSalt?: string;
  updatedAt: string;
}

function toView(doc: any): ImportTemplateView {
  return {
    id: String(doc._id),
    name: doc.name,
    includedOptionalFields: doc.includedOptionalFields ?? [],
    defaultManufacturer: doc.defaultManufacturer || undefined,
    defaultSalt: doc.defaultSalt || undefined,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

/**
 * GET /api/admin/products/import-templates
 * List saved bulk-import templates, most recently updated first. Admin only.
 */
export async function GET() {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const docs = await ImportTemplate.find().sort({ updatedAt: -1 }).lean();

    return NextResponse.json({ data: docs.map(toView) });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/products/import-templates
 * Create a named bulk-import template (a chosen subset of optional columns
 * on top of the fixed mandatory set). Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    const body = importTemplateSchema.parse(await req.json());

    await connectDB();

    try {
      const doc = await ImportTemplate.create(body);
      return NextResponse.json({ data: toView(doc) }, { status: 201 });
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
