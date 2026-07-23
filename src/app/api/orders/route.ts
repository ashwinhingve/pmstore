import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 * Query params: page, limit, status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const status = searchParams.get('status');

    await connectDB();

    // Build query
    const query: any = { userId: session.user.id };
    if (status) {
      query.orderStatus = status;
    }

    // Get total count
    const total = await Order.countDocuments(query);

    // Get orders with pagination
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('items')
      .populate('shippingAddressId')
      .lean();

    return NextResponse.json(
      {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
