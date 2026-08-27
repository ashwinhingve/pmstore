export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import Category from '@/models/Category';
import ImportTemplate from '@/models/ImportTemplate';
import { parseCsv } from '@/lib/import/csv-parse';
import { parseProductRow } from '@/lib/import/product-row';
import { generateUniqueSlug } from '@/lib/utils/slugify';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import { uploadProductImageBuffer, isAllowedImageFormat } from '@/lib/cloudinary/upload-product-image';

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
 * - Form data file upload (Content-Type: multipart/form-data, field name: 'file'),
 *   optionally with a 'templateId' field and one or more 'images' files (matched
 *   to rows by filename stem = SKU)
 *
 * For each row:
 * 1. Parse and validate using parseProductRow()
 * 2. If a template was selected, additionally require a salt/formula and a
 *    product image (CSV image_url_* or a matched batch image) — the client's
 *    "simplified template" mandatory-field set. No template → unchanged.
 * 3. Resolve category name → ObjectId (upsert)
 * 4. Upload any matched batch image to Cloudinary
 * 5. Upsert product by SKU using save() (not insertMany/updateMany)
 *    — triggers the pre-validate hook to compute compositionKey and unitPrice
 * 6. Collect errors for reporting
 *
 * Returns counts of created, updated, failed, and a sample of errors.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    let csvText: string;
    let templateId: string | null = null;
    const imagesBySku = new Map<string, File>();

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

      const templateField = form.get('templateId');
      if (typeof templateField === 'string' && templateField.trim()) {
        templateId = templateField.trim();
      }

      for (const entry of form.getAll('images')) {
        if (entry instanceof File && entry.size > 0 && isAllowedImageFormat(entry.name)) {
          const stem = entry.name.replace(/\.[^.]+$/, '').trim().toUpperCase();
          if (stem) imagesBySku.set(stem, entry);
        }
      }
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

    // A selected template tightens validation beyond the base importer: a
    // salt/formula and a product image become required on every row (see
    // src/lib/import/template-fields.ts). No templateId → today's behavior.
    let requireSaltAndImage = false;
    if (templateId) {
      const template = await ImportTemplate.findById(templateId).select('_id').lean();
      if (!template) {
        return NextResponse.json(
          { error: 'That import template no longer exists' },
          { status: 400 }
        );
      }
      requireSaltAndImage = true;
    }

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

      const parsed = parseResult.value;
      const matchedImage = imagesBySku.get(parsed.sku.trim().toUpperCase());

      if (requireSaltAndImage) {
        if (parsed.salts.length === 0) {
          errors.push({ sku: parsed.sku, reason: 'missing salt/formula (required by this template)' });
          continue;
        }
        if (parsed.imageUrls.length === 0 && !matchedImage) {
          errors.push({ sku: parsed.sku, reason: 'missing product image (required by this template)' });
          continue;
        }
      }

      try {
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

        // Map image URLs to images array (publicId left empty for import),
        // plus an uploaded batch image if one matched this row's SKU.
        const images = parsed.imageUrls.map((url, idx) => ({
          url,
          publicId: '', // Import doesn't upload URL-only images to Cloudinary — left empty
          order: idx,
        }));
        if (matchedImage) {
          const bytes = await matchedImage.arrayBuffer();
          const uploaded = await uploadProductImageBuffer(Buffer.from(bytes));
          images.push({ url: uploaded.url, publicId: uploaded.publicId, order: images.length });
        }

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
        console.error(`Import error for SKU ${parsed.sku}:`, err.message);
        errors.push({
          sku: parsed.sku,
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
