export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { parseCsv } from '@/lib/import/csv-parse';
import { parseProductRow } from '@/lib/import/product-row';
import { generateUniqueSlug } from '@/lib/utils/slugify';
import { createErrorResponse } from '@/lib/utils/errorHandler';

interface ImportError {
  sku?: string;
  reason: string;
}

/**
 * POST /api/admin/products/import
 * Import products from CSV
 * Admin only
 *
 * Accepts CSV as:
 * - Raw text body (Content-Type: text/plain)
 * - Form data file upload (Content-Type: multipart/form-data, field name: 'file')
 *
 * For each row:
 * 1. Parse and validate using parseProductRow()
 * 2. Resolve category name → ObjectId (upsert)
 * 3. Upsert product by SKU using save() (not insertMany/updateMany)
 *    — triggers the pre-validate hook to compute compositionKey and unitPrice
 * 4. Collect errors for reporting
 *
 * Returns counts of created, updated, failed, and a sample of errors.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    // Read CSV text from body or form
    let csvText: string;

    const contentType = req.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      // Read from form data
      const form = await req.formData();
      const file = form.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'No file provided or invalid file format' },
          { status: 400 }
        );
      }

      csvText = await file.text();
    } else {
      // Read raw text body
      csvText = await req.text();
    }

    csvText = csvText.trim();
    if (!csvText) {
      return NextResponse.json(
        { error: 'Empty CSV file' },
        { status: 400 }
      );
    }

    await connectDB();

    // Parse CSV into rows
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found in CSV' },
        { status: 400 }
      );
    }

    // Cache for category lookups to avoid repeated queries
    const categoryCache = new Map<string, string>();

    // Track results
    let created = 0;
    let updated = 0;
    const errors: ImportError[] = [];

    // Process each row
    for (const row of rows) {
      const parseResult = parseProductRow(row);

      if (!parseResult.ok) {
        errors.push({
          sku: parseResult.sku,
          reason: parseResult.reason,
        });
        continue;
      }

      try {
        const parsed = parseResult.value;

        // Resolve category name → ObjectId
        let categoryId: string;
        const categoryKey = parsed.categoryName.toLowerCase();

        if (categoryCache.has(categoryKey)) {
          categoryId = categoryCache.get(categoryKey)!;
        } else {
          // Find or create category (case-insensitive)
          let category = await Category.findOne({
            name: { $regex: `^${parsed.categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
          });

          if (!category) {
            // Create new category
            const slug = parsed.categoryName
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/--+/g, '-');

            category = new Category({
              name: parsed.categoryName,
              slug,
            });
            await category.save();
          }

          categoryId = String(category._id);
          categoryCache.set(categoryKey, categoryId);
        }

        // Map image URLs to images array (publicId left empty for import)
        const images = parsed.imageUrls.map((url, idx) => ({
          url,
          publicId: '', // Import doesn't upload to Cloudinary — left empty
          order: idx,
        }));

        // Upsert by SKU
        let isNew = false;
        let product = await Product.findOne({ sku: parsed.sku });

        if (product) {
          // Update existing product
          product.name = parsed.name;
          if (parsed.brand) product.brand = parsed.brand;
          product.manufacturer = parsed.manufacturer;
          product.category = categoryId as any;
          product.salts = parsed.salts;
          product.form = parsed.form;
          product.packSize = parsed.packSize;
          product.packUnit = parsed.packUnit;
          product.price = parsed.price;
          if (parsed.mrp !== undefined) product.mrp = parsed.mrp;
          product.gstRate = parsed.gstRate;
          product.stock = parsed.stock;
          product.prescriptionRequired = parsed.prescriptionRequired;
          product.scheduleClass = parsed.scheduleClass;
          if (parsed.hsnCode !== undefined) product.hsnCode = parsed.hsnCode;
          product.description = parsed.description;
          if (parsed.storageInstructions) product.storageInstructions = parsed.storageInstructions;
          if (parsed.usageInstructions) product.usageInstructions = parsed.usageInstructions;
          product.sideEffects = parsed.sideEffects;
          product.contraindications = parsed.contraindications;
          if (parsed.tags.length > 0) product.tags = parsed.tags;
          product.images = images as any;
          product.isActive = parsed.isActive;
        } else {
          // Create new product
          isNew = true;
          const slug = await generateUniqueSlug(parsed.name);

          product = new Product({
            sku: parsed.sku,
            name: parsed.name,
            slug,
            brand: parsed.brand,
            manufacturer: parsed.manufacturer,
            category: categoryId,
            salts: parsed.salts,
            form: parsed.form,
            packSize: parsed.packSize,
            packUnit: parsed.packUnit,
            price: parsed.price,
            mrp: parsed.mrp,
            gstRate: parsed.gstRate,
            stock: parsed.stock,
            prescriptionRequired: parsed.prescriptionRequired,
            scheduleClass: parsed.scheduleClass,
            hsnCode: parsed.hsnCode,
            description: parsed.description,
            storageInstructions: parsed.storageInstructions,
            usageInstructions: parsed.usageInstructions,
            sideEffects: parsed.sideEffects,
            contraindications: parsed.contraindications,
            tags: parsed.tags,
            images,
            isActive: parsed.isActive,
          });
        }

        // Save triggers pre-validate hook to compute compositionKey and unitPrice
        await product.save();

        if (isNew) {
          created++;
        } else {
          updated++;
        }
      } catch (err: any) {
        // Log only SKU and error message, never full product data (health data)
        console.error(`Import error for SKU ${parseResult.value.sku}:`, err.message);
        errors.push({
          sku: parseResult.value.sku,
          reason: err.message || 'Failed to save product',
        });
      }
    }

    return NextResponse.json(
      {
        data: {
          created,
          updated,
          failed: errors.length,
          errors: errors.slice(0, 50), // Return first 50 errors
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Import route error:', error);
    return createErrorResponse(error);
  }
}
