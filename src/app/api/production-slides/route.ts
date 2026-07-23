import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProductionSlide from '@/models/ProductionSlide';

// GET - Public: fetch active slides for homepage
export async function GET() {
  try {
    await connectDB();
    const slides = await ProductionSlide.find({ isActive: true })
      .sort({ order: 1 })
      .select('type src title description order')
      .lean();

    return NextResponse.json({ slides });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch slides' },
      { status: 500 }
    );
  }
}
