import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';

/**
 * GET /api/products
 * List products with filtering, search, and pagination
 * Public endpoint - only shows active products
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50); // Max 50 items

    // Filters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const featured = searchParams.get('featured');
    const bestseller = searchParams.get('bestseller');
    const trending = searchParams.get('trending');
    const valueBuy = searchParams.get('valueBuy');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    // Sorting (whitelist to prevent schema probing)
    const ALLOWED_SORT_FIELDS = ['createdAt', 'price', 'name', 'averageRating', 'totalReviews', 'stock'];
    const rawSortBy = searchParams.get('sortBy') || 'createdAt';
    const sortBy = ALLOWED_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    await connectDB();

    // Build query — active, non-discontinued products only
    const query: any = { isActive: true, isDiscontinued: { $ne: true } };

    // category is an ObjectId ref — only filter on a well-formed id, else a raw
    // string would throw a CastError (500).
    if (category && /^[a-f\d]{24}$/i.test(category)) {
      query.category = category;
    }

    if (subcategory) {
      query.subcategory = subcategory;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (bestseller === 'true') {
      query.isBestseller = true;
    }

    if (trending === 'true') {
      query.isTrending = true;
    }

    if (valueBuy === 'true') {
      query.isValueBuy = true;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Search - use text index
    if (search) {
      query.$text = { $search: search };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        query.price.$lte = parseFloat(maxPrice);
      }
    }

    // Build sort object
    const sort: any = {};
    if (search) {
      sort.score = { $meta: 'textScore' }; // Sort by relevance when searching
    } else {
      sort[sortBy] = sortOrder;
    }

    // Execute query with pagination
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-__v')
        .populate('category', 'name slug')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
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
