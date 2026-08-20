import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import User from '@/models/User';
import Order from '@/models/Order';
import { toCsv } from '@/lib/import/csv-parse';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/users/export
 * Export the matching users as CSV. Admin only.
 *
 * Honours the same `search` and `role` filters as the User management table, so
 * "Export CSV" downloads exactly the list the admin is looking at — but every
 * matching user, not just the current page. Phone/address are intentionally left
 * out (health-adjacent PII); name + email + role + order stats are enough here.
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const role = (searchParams.get('role') || '').trim();

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;

    const users = await User.find(query)
      .select('name email role createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();

    // One pass over paid orders → count + spend per user, then join in memory.
    const stats = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: '$userId', orders: { $sum: 1 }, spent: { $sum: '$totalAmount' } } },
    ]);
    const statsById = new Map(stats.map((s: any) => [String(s._id), s]));

    const columns = ['name', 'email', 'role', 'orders', 'total_spent', 'joined', 'last_login'];
    const rows = users.map((u: any) => {
      const s = statsById.get(String(u._id));
      return {
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'client',
        orders: s?.orders ?? 0,
        total_spent: s?.spent ?? 0,
        joined: u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
        last_login: u.lastLogin ? new Date(u.lastLogin).toISOString().slice(0, 10) : '',
      };
    });

    const csv = toCsv(rows, columns);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="users-export.csv"',
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
