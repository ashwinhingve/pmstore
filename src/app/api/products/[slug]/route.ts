import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';

/**
 * GET /api/products/[slug]
 * Get a single product by slug
 * Public endpoint - only shows active products
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    const product = await Product.findOne({
      slug,
      isActive: true,
      isDiscontinued: { $ne: true },
    })
      .select('-__v')
      .populate('category', 'name slug')
      .lean() as any;

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Related products share the same composition (the Strip's data), falling
    // back to the same category. product.category is populated above, so match
    // on its id.
    const categoryId = product.category?._id ?? product.category;
    const relatedProducts = await Product.find({
      isActive: true,
      isDiscontinued: { $ne: true },
      _id: { $ne: product._id },
      ...(product.compositionKey
        ? { compositionKey: product.compositionKey }
        : { category: categoryId }),
    })
      .select('name slug price originalPrice unitPrice packSize packUnit images averageRating category')
      .populate('category', 'name slug')
      .limit(4)
      .lean();

    return NextResponse.json({
      product,
      relatedProducts,
    });
  } catch (error: any) {
    console.error('❌ Error fetching product:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
