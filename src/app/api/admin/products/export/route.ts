import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { toCsv } from '@/lib/import/csv-parse';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/products/export
 * Export all products as CSV
 * Admin only
 *
 * The CSV includes all product fields needed to re-import, with salts flattened
 * into salt_1_name, salt_1_strength, salt_1_unit, salt_2_name, ... columns.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    // Fetch all products, lean to avoid hydration
    const products = await Product.find({})
      .lean()
      .exec();

    // Populate category names — fetch all category IDs at once
    const categoryIds = new Set(products.map((p: any) => p.category));
    const categories = await Category.find({ _id: { $in: Array.from(categoryIds) } })
      .lean()
      .exec();

    const categoryMap = new Map(categories.map((c: any) => [String(c._id), c.name]));

    // Compute max salts to determine column count
    let maxSalts = 0;
    for (const product of products) {
      maxSalts = Math.max(maxSalts, (product as any).salts?.length ?? 0);
    }
    maxSalts = Math.min(maxSalts, 4); // Cap at 4 salts for sanity

    // Compute max images
    let maxImages = 0;
    for (const product of products) {
      maxImages = Math.max(maxImages, (product as any).images?.length ?? 0);
    }
    maxImages = Math.min(maxImages, 5); // Cap at 5 images

    // Build column order: base columns, salts, pack info, pricing, regulatory, description, etc., images
    const columns = [
      'sku',
      'name',
      'brand',
      'manufacturer',
      'category',
      'form',
      ...Array.from({ length: maxSalts }, (_, i) => [
        `salt_${i + 1}_name`,
        `salt_${i + 1}_strength`,
        `salt_${i + 1}_unit`,
      ]).flat(),
      'pack_size',
      'pack_unit',
      'price',
      'mrp',
      'gst_rate',
      'stock',
      'prescription_required',
      'schedule_class',
      'hsn_code',
      'short_description',
      'storage_instructions',
      'usage_instructions',
      'side_effects',
      'contraindications',
      ...Array.from({ length: maxImages }, (_, i) => `image_url_${i + 1}`),
      'is_active',
    ];

    // Transform products to export records
    const rows: Record<string, string | number | boolean | undefined>[] = products.map((p: any) => {
      const row: Record<string, string | number | boolean | undefined> = {
        sku: p.sku,
        name: p.name,
        brand: p.brand ?? '',
        manufacturer: p.manufacturer,
        category: categoryMap.get(String(p.category)) ?? '',
        form: p.form,
      };

      // Flatten salts
      const salts = p.salts ?? [];
      for (let i = 0; i < maxSalts; i++) {
        if (salts[i]) {
          row[`salt_${i + 1}_name`] = salts[i].name;
          row[`salt_${i + 1}_strength`] = salts[i].strength;
          row[`salt_${i + 1}_unit`] = salts[i].unit;
        } else {
          row[`salt_${i + 1}_name`] = '';
          row[`salt_${i + 1}_strength`] = '';
          row[`salt_${i + 1}_unit`] = '';
        }
      }

      // Pack info
      row.pack_size = p.packSize;
      row.pack_unit = p.packUnit;

      // Pricing
      row.price = p.price;
      row.mrp = p.mrp ?? '';
      row.gst_rate = p.gstRate;

      // Inventory
      row.stock = p.stock;

      // Regulatory
      row.prescription_required = p.prescriptionRequired ? 'TRUE' : 'FALSE';
      row.schedule_class = p.scheduleClass;
      row.hsn_code = p.hsnCode ?? '';

      // Description
      row.short_description = p.shortDescription ?? p.description ?? '';

      // Instructions
      row.storage_instructions = p.storageInstructions ?? '';
      row.usage_instructions = p.usageInstructions ?? '';

      // Lists
      row.side_effects = (p.sideEffects ?? []).join('|');
      row.contraindications = (p.contraindications ?? []).join('|');

      // Images — extract URLs
      const images = p.images ?? [];
      for (let i = 0; i < maxImages; i++) {
        row[`image_url_${i + 1}`] = images[i]?.url ?? '';
      }

      // Active
      row.is_active = p.isActive ? 'TRUE' : 'FALSE';

      return row;
    });

    // Generate CSV
    const csv = toCsv(rows, columns);

    // Return as downloadable CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="products-export.csv"',
      },
    });
  } catch (error: any) {
    console.error('Error exporting products:', error);
    return createErrorResponse(error);
  }
}
