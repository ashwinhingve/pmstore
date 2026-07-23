import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { productSchema } from '@/lib/validations/product';
import { generateUniqueSlug } from '@/lib/utils/slugify';
import { ensureUniqueSKU } from '@/lib/utils/sku-generator';

/**
 * POST /api/admin/products
 * Create a new product
 * Admin only
 */
export async function POST(req: NextRequest) {
  // Verify admin access
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const body = await req.json();

    // Validate with Zod
    const validated = productSchema.parse(body);

    await connectDB();

    // Ensure slug is unique
    const uniqueSlug = await generateUniqueSlug(validated.name);
    validated.slug = uniqueSlug;

    // Ensure SKU is unique
    const uniqueSKU = await ensureUniqueSKU(validated.sku);
    validated.sku = uniqueSKU;

    // Calculate discount percentage if not provided
    if (validated.originalPrice && validated.originalPrice > validated.price) {
      validated.discountPercentage = Math.round(
        ((validated.originalPrice - validated.price) / validated.originalPrice) * 100
      );
    }

    // Create product
    const product = await Product.create(validated);

    // Invalidate homepage cache so new products appear immediately
    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json(
      {
        success: true,
        product,
        message: 'Product created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating product:', error);

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        {
          error: `${field} already exists`,
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create product',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/products
 * List all products (including inactive)
 * Admin only
 */
export async function GET(req: NextRequest) {
  // Verify admin access
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    // Filters
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');
    const stockLevel = searchParams.get('stockLevel'); // 'low', 'out', 'available'

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    await connectDB();

    // Build query
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Stock level filter
    if (stockLevel === 'low') {
      query.stock = { $gt: 0, $lte: 10 };
    } else if (stockLevel === 'out') {
      query.stock = 0;
    } else if (stockLevel === 'available') {
      query.stock = { $gt: 10 };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-__v')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Get category counts for filters
    const categoryCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get status counts
    const statusCounts = await Product.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        categories: categoryCounts,
        statuses: statusCounts,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching products:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
