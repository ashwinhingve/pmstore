import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import User from '@/models/User';
import { z } from 'zod';
import { Errors, createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/users
 * List all users with optional filtering and pagination
 * Admin only
 *
 * Query params:
 * - role: 'client' | 'staff' | 'admin' (optional filter)
 * - search: matches name/email/phoneNumber (optional)
 * - page: default 1
 * - limit: default 20, max 50
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
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    await connectDB();

    // Build query
    const query: any = {};

    // Role filter
    if (role && ['client', 'staff', 'admin'].includes(role)) {
      query.role = role;
    }

    // Search filter: matches name, fullName, email, or phoneNumber (case-insensitive)
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('email fullName name phoneNumber role emailVerified mobileVerified createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Serialize _id to string
    const serializedUsers = users.map((user: any) => ({
      ...user,
      _id: String(user._id),
    }));

    return NextResponse.json({
      data: serializedUsers,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
