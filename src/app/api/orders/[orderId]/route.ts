import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb/connection';
import Order from '@/models/Order';

/**
 * GET /api/orders/:orderId
 * Get a single order by ID
 * User can only access their own orders (or admin can access all)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orderId } = await params;

    await connectDB();

    // Build query - user can only see their own orders
    const query: any = { _id: orderId };

    // If not admin, restrict to user's own orders
    if (session.user.role !== 'admin') {
      query.userId = session.user.id;
    }

    const order = await Order.findOne(query)
      .populate('items')
      .populate('shippingAddressId')
      .populate('billingAddressId')
      .populate('userId', 'name email')
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('❌ Get order error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
