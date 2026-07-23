import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProductionSlide from '@/models/ProductionSlide';
import { verifyAdminAccess } from '@/lib/auth-helpers';

// GET - List all production slides
export async function GET() {
  try {
    await connectDB();
    const slides = await ProductionSlide.find().sort({ order: 1 }).lean();
    return NextResponse.json({ slides });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch slides' },
      { status: 500 }
    );
  }
}

// POST - Create a new production slide
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const body = await request.json();
    const { type, src, publicId, title, description, isActive } = body;

    if (!type || !src || !title || !description) {
      return NextResponse.json(
        { error: 'type, src, title, and description are required' },
        { status: 400 }
      );
    }

    // Get the next order number
    const maxOrder = await ProductionSlide.findOne().sort({ order: -1 }).select('order').lean();
    const order = (maxOrder as any)?.order != null ? (maxOrder as any).order + 1 : 0;

    const slide = await ProductionSlide.create({
      type,
      src,
      publicId,
      title,
      description,
      order,
      isActive: isActive !== false,
    });

    return NextResponse.json({ slide }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create slide' },
      { status: 500 }
    );
  }
}

// PATCH - Reorder slides
export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();
    const body = await request.json();
    const { slideIds } = body; // Array of slide IDs in new order

    if (!Array.isArray(slideIds)) {
      return NextResponse.json(
        { error: 'slideIds array is required' },
        { status: 400 }
      );
    }

    const updates = slideIds.map((id: string, index: number) =>
      ProductionSlide.findByIdAndUpdate(id, { order: index })
    );
    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reorder slides' },
      { status: 500 }
    );
  }
}
