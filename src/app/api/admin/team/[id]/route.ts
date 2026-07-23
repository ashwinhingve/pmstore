import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import TeamMember from '@/models/TeamMember';
import cloudinary from '@/lib/cloudinary/config';

/** PATCH /api/admin/team/[id] — update a member */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();

    const { name, role, bio, email, photoUrl, photoPublicId, order: memberOrder, isActive, socialLinks } = body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (bio !== undefined) update.bio = bio;
    if (email !== undefined) update.email = email;
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (photoPublicId !== undefined) update.photoPublicId = photoPublicId;
    if (memberOrder !== undefined) update.order = memberOrder;
    if (isActive !== undefined) update.isActive = isActive;
    if (socialLinks !== undefined) update.socialLinks = socialLinks;

    const member = await TeamMember.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/admin/team/[id] — delete a member and their photo */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;
    await connectDB();

    const member = await TeamMember.findById(id);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Delete photo from Cloudinary
    if (member.photoPublicId) {
      try {
        await cloudinary.uploader.destroy(member.photoPublicId);
      } catch (err) {
        console.error('Failed to delete team photo from Cloudinary:', err);
      }
    }

    await member.deleteOne();
    return NextResponse.json({ message: 'Team member deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
