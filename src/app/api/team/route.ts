import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import TeamMember from '@/models/TeamMember';

/**
 * GET /api/team
 * Public endpoint — returns all active team members sorted by order
 */
export async function GET() {
  try {
    await connectDB();
    const members = await TeamMember.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
