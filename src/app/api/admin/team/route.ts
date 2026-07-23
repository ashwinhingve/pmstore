import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import TeamMember from '@/models/TeamMember';

/** GET /api/admin/team — list all members (admin) */
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const members = await TeamMember.find().sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/admin/team — create a new member */
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const body = await req.json();
    const { name, designation, photo, photoPublicId, bio, linkedin, twitter, email, order } = body;

    if (!name?.trim() || !designation?.trim()) {
      return NextResponse.json({ error: 'Name and designation are required' }, { status: 400 });
    }

    await connectDB();

    const count = await TeamMember.countDocuments();
    const member = await TeamMember.create({
      name: name.trim(),
      designation: designation.trim(),
      photo: photo || '',
      photoPublicId: photoPublicId || '',
      bio: bio || '',
      linkedin: linkedin || '',
      twitter: twitter || '',
      email: email || '',
      order: order ?? count,
      isActive: true,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
