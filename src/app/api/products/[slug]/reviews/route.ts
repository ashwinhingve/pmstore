import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Review from '@/models/Review';
import Product from '@/models/Product';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';

// GET /api/products/[slug]/reviews - Get reviews for a product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    const product = await Product.findOne({ slug }).select('_id').lean();
    if (!product) {
      return NextResponse.json({ reviews: [], totalReviews: 0, averageRating: 0, ratingDistribution: [0,0,0,0,0] });
    }
    const productId = (product as any)._id;

    const reviews = await Review.find({
      productId,
      isApproved: true,
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate rating distribution
    const allReviews = await Review.find({ productId, isApproved: true }).lean();
    const ratingDistribution = [0, 0, 0, 0, 0]; // index 0 = 1 star, index 4 = 5 stars
    let totalRating = 0;

    allReviews.forEach((r: any) => {
      ratingDistribution[r.rating - 1]++;
      totalRating += r.rating;
    });

    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    const serialized = reviews.map((r: any) => ({
      id: r._id.toString(),
      userName: r.userId?.name || 'Anonymous',
      rating: r.rating,
      title: r.title || '',
      comment: r.comment,
      isVerifiedPurchase: r.isVerifiedPurchase,
      helpfulCount: r.helpfulCount,
      images: r.images || [],
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      reviews: serialized,
      totalReviews: allReviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/products/[slug]/reviews - Submit a review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Please login to write a review' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();

    const { rating, title, comment, images } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (!comment || comment.trim().length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 });
    }

    const reviewImages: string[] = Array.isArray(images)
      ? images.filter((url: any) => typeof url === 'string').slice(0, 3)
      : [];

    await connectDB();

    // Look up product by slug to get its ObjectId
    const product = await Product.findOne({ slug });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const productId = product._id;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      productId,
      userId: session.user.id,
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      );
    }

    // Check if user has purchased this product (verified purchase)
    const userOrders = await Order.find({
      userId: session.user.id,
      paymentStatus: 'paid',
      orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
    }).select('_id');

    const orderIds = userOrders.map((o) => o._id);
    const hasPurchased = await OrderItem.exists({
      orderId: { $in: orderIds },
      productId,
    });

    // Create review (auto-approved for now)
    const review = await Review.create({
      productId,
      userId: session.user.id,
      rating,
      title: title?.trim() || '',
      comment: comment.trim(),
      isVerifiedPurchase: !!hasPurchased,
      isApproved: true,
      images: reviewImages,
    });

    // Update product average rating
    const stats = await Review.aggregate([
      { $match: { productId: product._id, isApproved: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      product.averageRating = Math.round(stats[0].avgRating * 10) / 10;
      product.totalReviews = stats[0].count;
      await product.save();
    }

    return NextResponse.json(
      {
        message: 'Review submitted successfully',
        review: {
          id: review._id.toString(),
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerifiedPurchase: review.isVerifiedPurchase,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      );
    }
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
