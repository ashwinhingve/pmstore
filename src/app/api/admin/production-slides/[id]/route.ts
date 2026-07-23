import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProductionSlide from '@/models/ProductionSlide';
import { verifyAdminAccess } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Update a slide
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const slide = await ProductionSlide.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!slide) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    return NextResponse.json({ slide });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update slide' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a slide
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const { id } = await params;

    const slide = await ProductionSlide.findByIdAndDelete(id);

    if (!slide) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    // If it has a Cloudinary publicId, delete from Cloudinary too
    if (slide.publicId) {
      try {
        const cloudinary = (await import('@/lib/cloudinary/config')).default;
        await cloudinary.uploader.destroy(slide.publicId);
      } catch (err) {
        console.error('Failed to delete from Cloudinary:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete slide' },
      { status: 500 }
    );
  }
}
