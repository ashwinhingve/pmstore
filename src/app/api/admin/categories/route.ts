import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Category from '@/models/Category';

// GET /api/admin/categories - List all categories
export async function GET() {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    await connectDB();
    const categories = await Category.find().sort({ order: 1, name: 1 }).lean();
    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/categories - Create a category
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const body = await req.json();
    const { name, icon, image, order } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Category name is required (min 2 chars)' }, { status: 400 });
    }

    await connectDB();

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    const category = await Category.create({
      name: name.trim(),
      slug,
      icon: icon || '',
      image: image || '',
      order: order || 0,
    });

    return NextResponse.json({ category, message: 'Category created' }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
