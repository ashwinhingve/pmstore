import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import ImportTemplate from '@/models/ImportTemplate';
import { resolveTemplateColumns } from '@/lib/import/template-fields';
import { buildTemplateCsv } from '@/lib/import/template-csv';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

interface TemplateDoc {
  name: string;
  includedOptionalFields?: string[];
  defaultManufacturer?: string;
  defaultSalt?: string;
}

/**
 * GET /api/admin/products/import-templates/[id]/download
 * Download a saved template as a CSV: header row scoped to the mandatory +
 * chosen optional columns, plus one example row (with the template's default
 * manufacturer/salt baked in, if set). Admin only.
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
    const doc = await ImportTemplate.findById(id).lean<TemplateDoc | null>();
    if (!doc) throw Errors.notFound('Import template', id);

    const columns = resolveTemplateColumns(doc.includedOptionalFields ?? []);
    const overrides: Record<string, string> = {};
    if (doc.defaultManufacturer) overrides.manufacturer = doc.defaultManufacturer;
    if (doc.defaultSalt) overrides.salt_1_name = doc.defaultSalt;
    const csv = buildTemplateCsv(columns, overrides);

    const filename = `${doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-import-template.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
