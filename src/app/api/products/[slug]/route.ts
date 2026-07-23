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
    })
      .select('-__v')
      .lean() as any;

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch related products (same category, excluding current product)
    const relatedProducts = await Product.find({
      category: product.category,
      isActive: true,
      _id: { $ne: product._id },
    })
      .select('name slug price originalPrice images averageRating category')
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
