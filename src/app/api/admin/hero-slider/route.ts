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
 * GET /api/admin/hero-slider
 * Returns the current hero slides array
 */
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const doc = await SiteSettings.collection.findOne(FILTER, {
      projection: { heroSlider: 1 },
    });
    const slides = serializeSlides((doc as any)?.heroSlider?.slides || []);
    return NextResponse.json({ success: true, slides });
  } catch (error: any) {
    console.error('Error fetching hero slides:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/hero-slider
 * Add a new slide. Uses $push to avoid overwriting existing slides.
 * Returns the full updated slides array.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const body = await request.json();

    // Ensure the settings document exists with an empty slides array if new
    await SiteSettings.collection.updateOne(
      FILTER,
      { $setOnInsert: { key: 'global', heroSlider: { slides: [] } } },
      { upsert: true }
    );

    // Count existing slides to set the order value
    const existing = await SiteSettings.collection.findOne(FILTER, {
      projection: { 'heroSlider.slides': 1 },
    });
    const currentCount = (existing as any)?.heroSlider?.slides?.length ?? 0;

    const newSlide = {
      _id: new ObjectId(),
      image: body.image || '',
      imagePublicId: body.imagePublicId || '',
      title: body.title || '',
      subtitle: body.subtitle || '',
      description: body.description || '',
      ctaText: body.ctaText || 'Shop Now',
      ctaLink: body.ctaLink || '/products',
      ctaSecondaryText: body.ctaSecondaryText || '',
      ctaSecondaryLink: body.ctaSecondaryLink || '/products',
      isActive: body.isActive !== false,
      order: currentCount,
    };

    const result = await SiteSettings.collection.findOneAndUpdate(
      FILTER,
      { $push: { 'heroSlider.slides': newSlide } } as any,
      { returnDocument: 'after' }
    );

    const slides = serializeSlides((result as any)?.heroSlider?.slides || []);
    return NextResponse.json({ success: true, slides });
  } catch (error: any) {
    console.error('Error adding hero slide:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/hero-slider
 * Replace the entire slides array (used for reorder).
 * Returns the full updated slides array.
 */
export async function PUT(request: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const { slides } = await request.json();

    const slidesToSave = (slides as any[]).map((s: any, i: number) => ({
      ...s,
      _id: s._id ? new ObjectId(s._id) : new ObjectId(),
      order: i,
    }));

    const result = await SiteSettings.collection.findOneAndUpdate(
      FILTER,
      { $set: { 'heroSlider.slides': slidesToSave } },
      { returnDocument: 'after', upsert: true }
    );

    const updatedSlides = serializeSlides((result as any)?.heroSlider?.slides || []);
    return NextResponse.json({ success: true, slides: updatedSlides });
  } catch (error: any) {
    console.error('Error reordering hero slides:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
