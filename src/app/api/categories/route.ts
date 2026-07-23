import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Category from '@/models/Category';

// GET /api/categories - Public: list active categories
export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select('name slug icon image order')
      .lean();

    return NextResponse.json({
      categories: JSON.parse(JSON.stringify(categories)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
