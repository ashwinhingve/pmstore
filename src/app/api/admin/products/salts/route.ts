import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import SaltCatalog from '@/models/SaltCatalog';
import { saltCatalogSchema } from '@/lib/validations/salt-catalog';
import { isKnownSalt } from '@/lib/pharma/common-salts';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/products/salts
 * List the admin-added salt catalogue (names only), on top of which the salt
 * autocomplete merges its compiled base list. Admin only.
 */
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const docs = await SaltCatalog.find()
      .select('name')
      .sort({ nameLower: 1 })
      .lean<{ name: string }[]>();

    return NextResponse.json({ salts: docs.map((d) => d.name) });
  } catch (error) {
    console.error('❌ Error listing salts:', error);
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/products/salts
 * Add a salt name to the catalogue so it appears in the dropdown next time.
 * Idempotent: a name already in the base list or the catalogue succeeds without
 * creating a duplicate. Admin only.
 */
export async function POST(req: Request) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { name } = saltCatalogSchema.parse(await req.json());

    await connectDB();

    // Already suggestible from the compiled shortlist — nothing to persist.
    if (isKnownSalt(name)) {
      return NextResponse.json({ salt: name, existed: true });
    }

    try {
      const doc = await SaltCatalog.create({ name });
      return NextResponse.json({ salt: doc.name }, { status: 201 });
    } catch (err: any) {
      // Concurrent/repeat add of the same name — treat as success (idempotent).
      if (err?.code === 11000) {
        const existing = await SaltCatalog.findOne({ nameLower: name.toLowerCase() })
          .select('name')
          .lean<{ name: string } | null>();
        return NextResponse.json({ salt: existing?.name ?? name, existed: true });
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
    console.error('❌ Error adding salt:', error);
    return createErrorResponse(error);
  }
}
