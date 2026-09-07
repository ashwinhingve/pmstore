export const runtime = 'nodejs';
// Request the platform's maximum allowed execution time — commit-mode imports
// still do a per-row save() (and optional Cloudinary upload), and the client
// chunks large files, but a single chunk should still get all the headroom
// available on a budget/Hobby-tier deploy.
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import Category from '@/models/Category';
import ImportTemplate from '@/models/ImportTemplate';
import { parseCsv } from '@/lib/import/csv-parse';
import { parseProductRow, type ParsedProductRow } from '@/lib/import/product-row';
import { generateUniqueSlug } from '@/lib/utils/slugify';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import { uploadProductImageBuffer, isAllowedImageFormat } from '@/lib/cloudinary/upload-product-image';
import { bulkProductImportBodySchema, type BulkProductRow } from '@/lib/validations/bulk-product-import';
import { bulkRowToParsedProductRow } from '@/lib/import/bulk-row-converter';
import { findDuplicateProducts } from '@/lib/admin/duplicate-detection';

interface ImportError {
  sku?: string;
  reason: string;
}

interface RowDuplicateWarning {
  sku: string;
  message: string;
  matches: Array<{
    _id: string;
    name: string;
    manufacturer: string;
    packSize: number;
    packUnit: string;
    unitPrice: number;
    slug: string;
  }>;
}

interface RowOptions {
  requireSaltAndImage: boolean;
  imagesBySku: Map<string, File>;
  // For JSON path: Cloudinary image URLs/publicIds pre-uploaded
  imagesCloudinary?: Map<string, { url: string; publicId: string }>;
}

/**
 * POST /api/admin/products/import
 * Import products from CSV or JSON. Admin only.
 *
 * Accepts input as:
 * 1. CSV (Raw text or multipart form upload):
 *    - Raw text body (Content-Type: text/plain)
 *    - Form data file upload (Content-Type: multipart/form-data, field name: 'file'),
 *      optionally with a 'templateId' field and one or more 'images' files (matched
 *      to rows by filename stem = SKU)
 *
 * 2. JSON structured rows:
 *    - JSON body (Content-Type: application/json) with shape:
 *      { rows: BulkProductRow[], images?: Record<string, { url, publicId }> }
 *    - Images are pre-uploaded to Cloudinary; referenced by SKU key
 *    - No templateId — validation is purely Zod-based
 *
 * `?mode=validate` (default: `commit`) runs every row through parsing/gating WITHOUT
 * writing anything. In JSON mode, also performs per-row duplicate checking. Returns
 * "what would happen" so the UI can show a preview. `?mode=commit` writes products.
 *
 * Column mapping (CSV-specific) is applied client-side before upload — this route
 * always sees canonical column names. A selected template requires salt/formula and
 * product image on every row (CSV mode only).
 *
 * compositionKey/unitPrice are never computed here — Product.save() triggers the
 * pre-validate hook that derives them. Never insertMany/updateMany.
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    const mode = req.nextUrl.searchParams.get('mode') === 'validate' ? 'validate' : 'commit';
    const contentType = req.headers.get('content-type');

    await connectDB();

    // JSON path
    if (contentType?.includes('application/json')) {
      return handleJsonImport(req, mode);
    }

    // CSV path (existing logic)
    let csvText: string;
    let templateId: string | null = null;
    const imagesBySku = new Map<string, File>();

    if (contentType?.includes('multipart/form-data')) {
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
      csvText = await req.text();
    }

    csvText = csvText.trim();
    if (!csvText) {
      return NextResponse.json({ error: 'Empty CSV file' }, { status: 400 });
    }

    // A selected template tightens validation beyond the base importer: a
    // salt/formula and a product image become required on every row.
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

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 400 });
    }

    const opts: RowOptions = { requireSaltAndImage, imagesBySku };
    return mode === 'validate' ? runValidate(rows, opts) : runCommit(rows, opts);
  } catch (error: any) {
    console.error('Import route error:', error);
    return createErrorResponse(error);
  }
}

/**
 * Handle JSON import request. Converts BulkProductRow[] to ParsedProductRow[]
 * and flows through the same validate/commit logic as CSV path.
 */
async function handleJsonImport(req: NextRequest, mode: 'validate' | 'commit'): Promise<NextResponse> {
  try {
    const body = bulkProductImportBodySchema.parse(await req.json());

    // Convert BulkProductRow[] to ParsedProductRow[], adding image URLs from the images map
    const parsedRows: ParsedProductRow[] = [];
    for (const bulkRow of body.rows) {
      const parsed = bulkRowToParsedProductRow(bulkRow);
      // If this row has an image reference and it's in the images map, add the URL
      // Normalize to uppercase to match the key convention (SKU is case-insensitive)
      if (bulkRow.image && body.images?.[bulkRow.image.toUpperCase()]) {
        const img = body.images[bulkRow.image.toUpperCase()] as { url: string; publicId: string };
        parsed.imageUrls.push(img.url);
      }
      parsedRows.push(parsed);
    }

    // Build a map of SKU → Cloudinary image for the commit step
    const imagesCloudinary = new Map<string, { url: string; publicId: string }>();
    if (body.images) {
      for (const [sku, imgData] of Object.entries(body.images)) {
        imagesCloudinary.set(sku.toUpperCase(), imgData as { url: string; publicId: string });
      }
    }

    const opts: RowOptions = {
      requireSaltAndImage: false, // JSON mode has no template requirement
      imagesBySku: new Map(),
      imagesCloudinary,
    };

    // In JSON mode, validate mode also includes per-row duplicate warnings
    if (mode === 'validate') {
      return await runValidateWithDuplicateWarnings(parsedRows, opts);
    } else {
      return runCommitWithParsedRows(parsedRows, opts);
    }
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues ?? error.errors },
        { status: 400 }
      );
    }
    console.error('JSON import error:', error);
    return createErrorResponse(error);
  }
}

/** Parse + gate every row, collecting the ones that pass. Shared by both modes. */
function parseAndGate(
  rows: Record<string, string>[],
  opts: RowOptions
): { parsed: ParsedProductRow[]; errors: ImportError[] } {
  const parsed: ParsedProductRow[] = [];
  const errors: ImportError[] = [];

  for (const row of rows) {
    const parseResult = parseProductRow(row);
    if (!parseResult.ok) {
      errors.push({ sku: parseResult.sku, reason: parseResult.reason });
      continue;
    }

    const p = parseResult.value;
    if (opts.requireSaltAndImage) {
      if (p.salts.length === 0) {
        errors.push({ sku: p.sku, reason: 'missing salt/formula (required by this template)' });
        continue;
      }
      const hasImage = p.imageUrls.length > 0 || opts.imagesBySku.has(p.sku.trim().toUpperCase());
      if (!hasImage) {
        errors.push({ sku: p.sku, reason: 'missing product image (required by this template)' });
        continue;
      }
    }

    parsed.push(p);
  }

  return { parsed, errors };
}

/** mode=validate — zero writes. Two bulk queries answer create/update/new-category counts. */
async function runValidate(
  rows: Record<string, string>[],
  opts: RowOptions
): Promise<NextResponse> {
  const { parsed, errors } = parseAndGate(rows, opts);

  const skus = parsed.map((p) => p.sku);
  const existingSkus = new Set(
    skus.length
      ? (await Product.find({ sku: { $in: skus } }).select('sku').lean<{ sku: string }[]>()).map(
          (p) => p.sku
        )
      : []
  );

  const categoryNamesInFile = [...new Set(parsed.map((p) => p.categoryName))];
  const existingCategoryNamesLower = new Set(
    (await Category.find().select('name').lean<{ name: string }[]>()).map((c) =>
      c.name.toLowerCase()
    )
  );
  const newCategories = categoryNamesInFile
    .filter((name) => !existingCategoryNamesLower.has(name.toLowerCase()))
    .slice(0, 20);

  // Track SKUs "seen" during this pass too — two rows in the same file
  // sharing a SKU resolve to one create + one update, same as commit mode's
  // sequential save() would produce.
  let willCreate = 0;
  let willUpdate = 0;
  const seen = new Set(existingSkus);
  for (const p of parsed) {
    if (seen.has(p.sku)) {
      willUpdate++;
    } else {
      willCreate++;
      seen.add(p.sku);
    }
  }

  // SKUs that appear more than once within this file — these silently
  // collapse to a single saved row (last one wins), so flag them instead of
  // letting an admin assume every row became its own product.
  const skuCounts = new Map<string, number>();
  for (const p of parsed) {
    skuCounts.set(p.sku, (skuCounts.get(p.sku) ?? 0) + 1);
  }
  const duplicateSkusInFile = [...skuCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku)
    .slice(0, 50);

  return NextResponse.json(
    {
      data: {
        mode: 'validate',
        totalRows: rows.length,
        valid: parsed.length,
        willCreate,
        willUpdate,
        newCategories,
        duplicateSkusInFile,
        errors: errors.slice(0, 50),
      },
    },
    { status: 200 }
  );
}

/**
 * Validate mode for JSON path, includes per-row duplicate warnings.
 * Returns the same structure as runValidate() but with an added
 * duplicateWarnings field per row.
 */
async function runValidateWithDuplicateWarnings(
  parsedRows: ParsedProductRow[],
  opts: RowOptions
): Promise<NextResponse> {
  const errors: ImportError[] = [];
  const parsed = parsedRows; // Already parsed by handleJsonImport

  const skus = parsed.map((p) => p.sku);
  const existingSkus = new Set(
    skus.length
      ? (await Product.find({ sku: { $in: skus } }).select('sku').lean<{ sku: string }[]>()).map(
          (p) => p.sku
        )
      : []
  );

  const categoryNamesInFile = [...new Set(parsed.map((p) => p.categoryName))];
  const existingCategoryNamesLower = new Set(
    (await Category.find().select('name').lean<{ name: string }[]>()).map((c) =>
      c.name.toLowerCase()
    )
  );
  const newCategories = categoryNamesInFile
    .filter((name) => !existingCategoryNamesLower.has(name.toLowerCase()))
    .slice(0, 20);

  // Track SKUs "seen" during this pass
  let willCreate = 0;
  let willUpdate = 0;
  const seen = new Set(existingSkus);
  for (const p of parsed) {
    if (seen.has(p.sku)) {
      willUpdate++;
    } else {
      willCreate++;
      seen.add(p.sku);
    }
  }

  // Duplicate SKUs within this file
  const skuCounts = new Map<string, number>();
  for (const p of parsed) {
    skuCounts.set(p.sku, (skuCounts.get(p.sku) ?? 0) + 1);
  }
  const duplicateSkusInFile = [...skuCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku)
    .slice(0, 50);

  // Per-row duplicate warnings (JSON-mode-only, advisory)
  // For each row, check if there's an existing product with same name/composition
  const duplicateWarnings: RowDuplicateWarning[] = [];
  for (const p of parsed) {
    const matches = await findDuplicateProducts({
      name: p.name,
      salts: p.salts,
      form: p.form,
      manufacturer: p.manufacturer,
      packSize: p.packSize,
      currentProductId: undefined,
      limit: 5,
    });

    if (matches.length > 0) {
      duplicateWarnings.push({
        sku: p.sku,
        message: `Found ${matches.length} product(s) with similar name/composition`,
        matches: matches.map((m) => ({
          _id: m._id,
          name: m.name,
          manufacturer: m.manufacturer,
          packSize: m.packSize,
          packUnit: m.packUnit,
          unitPrice: m.unitPrice,
          slug: m.slug,
        })),
      });
    }
  }

  return NextResponse.json(
    {
      data: {
        mode: 'validate',
        totalRows: parsed.length,
        valid: parsed.length,
        willCreate,
        willUpdate,
        newCategories,
        duplicateSkusInFile,
        errors: errors.slice(0, 50),
        duplicateWarnings: duplicateWarnings.slice(0, 50), // Advisory only
      },
    },
    { status: 200 }
  );
}

/** mode=commit — today's write behavior, with existing products bulk-prefetched by SKU. */
async function runCommit(
  rows: Record<string, string>[],
  opts: RowOptions
): Promise<NextResponse> {
  const { parsed, errors } = parseAndGate(rows, opts);

  const skus = parsed.map((p) => p.sku);
  const existingProducts = skus.length ? await Product.find({ sku: { $in: skus } }) : [];
  const productBySku = new Map(existingProducts.map((p) => [p.sku, p]));

  const categoryCache = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const p of parsed) {
    const matchedImage = opts.imagesBySku.get(p.sku.trim().toUpperCase());

    try {
      // Resolve category name → ObjectId
      let categoryId: string;
      const categoryKey = p.categoryName.toLowerCase();

      if (categoryCache.has(categoryKey)) {
        categoryId = categoryCache.get(categoryKey)!;
      } else {
        let category = await Category.findOne({
          name: { $regex: `^${p.categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (!category) {
          const slug = p.categoryName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-');

          category = new Category({ name: p.categoryName, slug });
          await category.save();
        }

        categoryId = String(category._id);
        categoryCache.set(categoryKey, categoryId);
      }

      // Map image URLs to images array (publicId left empty for import),
      // plus an uploaded batch image if one matched this row's SKU.
      const images = p.imageUrls.map((url, idx) => ({
        url,
        publicId: '',
        order: idx,
      }));
      if (matchedImage) {
        const bytes = await matchedImage.arrayBuffer();
        const uploaded = await uploadProductImageBuffer(Buffer.from(bytes));
        images.push({ url: uploaded.url, publicId: uploaded.publicId, order: images.length });
      }

      // Upsert by SKU — prefetched above, kept in sync below so duplicate
      // SKUs within one file still resolve to a single saved product.
      let isNew = false;
      let product = productBySku.get(p.sku);

      if (product) {
        product.name = p.name;
        if (p.brand) product.brand = p.brand;
        product.manufacturer = p.manufacturer;
        product.category = categoryId as any;
        product.salts = p.salts;
        product.form = p.form;
        product.packSize = p.packSize;
        product.packUnit = p.packUnit;
        product.price = p.price;
        if (p.mrp !== undefined) product.mrp = p.mrp;
        product.gstRate = p.gstRate;
        product.stock = p.stock;
        product.prescriptionRequired = p.prescriptionRequired;
        product.scheduleClass = p.scheduleClass;
        if (p.hsnCode !== undefined) product.hsnCode = p.hsnCode;
        product.description = p.description;
        if (p.storageInstructions) product.storageInstructions = p.storageInstructions;
        if (p.usageInstructions) product.usageInstructions = p.usageInstructions;
        product.sideEffects = p.sideEffects;
        product.contraindications = p.contraindications;
        if (p.tags.length > 0) product.tags = p.tags;
        product.images = images as any;
        product.isActive = p.isActive;
      } else {
        isNew = true;
        const slug = await generateUniqueSlug(p.name);

        product = new Product({
          sku: p.sku,
          name: p.name,
          slug,
          brand: p.brand,
          manufacturer: p.manufacturer,
          category: categoryId,
          salts: p.salts,
          form: p.form,
          packSize: p.packSize,
          packUnit: p.packUnit,
          price: p.price,
          mrp: p.mrp,
          gstRate: p.gstRate,
          stock: p.stock,
          prescriptionRequired: p.prescriptionRequired,
          scheduleClass: p.scheduleClass,
          hsnCode: p.hsnCode,
          description: p.description,
          storageInstructions: p.storageInstructions,
          usageInstructions: p.usageInstructions,
          sideEffects: p.sideEffects,
          contraindications: p.contraindications,
          tags: p.tags,
          images,
          isActive: p.isActive,
        });
      }

      // Save triggers pre-validate hook to compute compositionKey and unitPrice
      await product.save();
      productBySku.set(p.sku, product);

      if (isNew) created++;
      else updated++;
    } catch (err: any) {
      // Log only SKU and error message, never full product data (health data)
      console.error(`Import error for SKU ${p.sku}:`, err.message);
      errors.push({ sku: p.sku, reason: err.message || 'Failed to save product' });
    }
  }

  return NextResponse.json(
    {
      data: {
        created,
        updated,
        failed: errors.length,
        errors: errors.slice(0, 50),
      },
    },
    { status: 200 }
  );
}

/**
 * Commit mode for JSON path — uses ParsedProductRow[] directly
 * (already validated by Zod and converted by handleJsonImport).
 * Same product-save logic as runCommit() but with Cloudinary pre-uploaded images.
 */
async function runCommitWithParsedRows(
  parsedRows: ParsedProductRow[],
  opts: RowOptions
): Promise<NextResponse> {
  const parsed = parsedRows;
  const errors: ImportError[] = [];

  const skus = parsed.map((p) => p.sku);
  const existingProducts = skus.length ? await Product.find({ sku: { $in: skus } }) : [];
  const productBySku = new Map(existingProducts.map((p) => [p.sku, p]));

  const categoryCache = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const p of parsed) {
    // Check for Cloudinary image from the images map
    let matchedCloudinaryImage = null;
    if (opts.imagesCloudinary) {
      matchedCloudinaryImage = opts.imagesCloudinary.get(p.sku.trim().toUpperCase());
    }

    try {
      // Resolve category name → ObjectId
      let categoryId: string;
      const categoryKey = p.categoryName.toLowerCase();

      if (categoryCache.has(categoryKey)) {
        categoryId = categoryCache.get(categoryKey)!;
      } else {
        let category = await Category.findOne({
          name: { $regex: `^${p.categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (!category) {
          const slug = p.categoryName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-');

          category = new Category({ name: p.categoryName, slug });
          await category.save();
        }

        categoryId = String(category._id);
        categoryCache.set(categoryKey, categoryId);
      }

      // Map image URLs to images array (from imageUrls + Cloudinary image if present)
      const images = p.imageUrls.map((url, idx) => ({
        url,
        publicId: '',
        order: idx,
      }));

      if (matchedCloudinaryImage) {
        images.push({
          url: matchedCloudinaryImage.url,
          publicId: matchedCloudinaryImage.publicId,
          order: images.length,
        });
      }

      // Upsert by SKU
      let isNew = false;
      let product = productBySku.get(p.sku);

      if (product) {
        product.name = p.name;
        if (p.brand) product.brand = p.brand;
        product.manufacturer = p.manufacturer;
        product.category = categoryId as any;
        product.salts = p.salts;
        product.form = p.form;
        product.packSize = p.packSize;
        product.packUnit = p.packUnit;
        product.price = p.price;
        if (p.mrp !== undefined) product.mrp = p.mrp;
        product.gstRate = p.gstRate;
        product.stock = p.stock;
        product.prescriptionRequired = p.prescriptionRequired;
        product.scheduleClass = p.scheduleClass;
        if (p.hsnCode !== undefined) product.hsnCode = p.hsnCode;
        product.description = p.description;
        if (p.storageInstructions) product.storageInstructions = p.storageInstructions;
        if (p.usageInstructions) product.usageInstructions = p.usageInstructions;
        product.sideEffects = p.sideEffects;
        product.contraindications = p.contraindications;
        if (p.tags.length > 0) product.tags = p.tags;
        product.images = images as any;
        product.isActive = p.isActive;
      } else {
        isNew = true;
        const slug = await generateUniqueSlug(p.name);

        product = new Product({
          sku: p.sku,
          name: p.name,
          slug,
          brand: p.brand,
          manufacturer: p.manufacturer,
          category: categoryId,
          salts: p.salts,
          form: p.form,
          packSize: p.packSize,
          packUnit: p.packUnit,
          price: p.price,
          mrp: p.mrp,
          gstRate: p.gstRate,
          stock: p.stock,
          prescriptionRequired: p.prescriptionRequired,
          scheduleClass: p.scheduleClass,
          hsnCode: p.hsnCode,
          description: p.description,
          storageInstructions: p.storageInstructions,
          usageInstructions: p.usageInstructions,
          sideEffects: p.sideEffects,
          contraindications: p.contraindications,
          tags: p.tags,
          images,
          isActive: p.isActive,
        });
      }

      // Save triggers pre-validate hook to compute compositionKey and unitPrice
      await product.save();
      productBySku.set(p.sku, product);

      if (isNew) created++;
      else updated++;
    } catch (err: any) {
      console.error(`Import error for SKU ${p.sku}:`, err.message);
      errors.push({ sku: p.sku, reason: err.message || 'Failed to save product' });
    }
  }

  return NextResponse.json(
    {
      data: {
        created,
        updated,
        failed: errors.length,
        errors: errors.slice(0, 50),
      },
    },
    { status: 200 }
  );
}
