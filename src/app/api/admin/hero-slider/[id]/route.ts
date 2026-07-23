import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import SiteSettings from '@/models/SiteSettings';

const FILTER = { key: 'global' };

function serializeSlides(slides: any[]): any[] {
  return (slides || []).map((s: any) => ({
    ...s,
    _id: s._id?.toString(),
  }));
}

/**
 * PATCH /api/admin/hero-slider/[id]
 * Update a specific slide by its MongoDB _id using arrayFilters.
 * Returns the full updated slides array.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;

    let slideId: ObjectId;
    try {
      slideId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();

    const allowedFields = [
      'image', 'imagePublicId', 'title', 'subtitle', 'description',
      'ctaText', 'ctaLink', 'ctaSecondaryText', 'ctaSecondaryLink',
      'isActive', 'order',
    ];

    const updateObj: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateObj[`heroSlider.slides.$[elem].${field}`] = body[field];
      }
    }

    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = await SiteSettings.collection.findOneAndUpdate(
      FILTER,
      { $set: updateObj },
      {
        returnDocument: 'after',
        arrayFilters: [{ 'elem._id': slideId }],
      } as any
    );

    const slides = serializeSlides((result as any)?.heroSlider?.slides || []);
    return NextResponse.json({ success: true, slides });
  } catch (error: any) {
    console.error('Error updating hero slide:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/hero-slider/[id]
 * Remove a specific slide by its MongoDB _id using $pull.
 * Returns the full updated slides array.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { id } = await params;

    let slideId: ObjectId;
    try {
      slideId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });
    }

    await connectDB();

    const result = await SiteSettings.collection.findOneAndUpdate(
      FILTER,
      { $pull: { 'heroSlider.slides': { _id: slideId } } } as any,
      { returnDocument: 'after' }
    );

    const slides = serializeSlides((result as any)?.heroSlider?.slides || []);
    return NextResponse.json({ success: true, slides });
  } catch (error: any) {
    console.error('Error deleting hero slide:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
