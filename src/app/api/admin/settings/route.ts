import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import SiteSettings from '@/models/SiteSettings';

/**
 * GET /api/admin/settings
 * Get site settings (admin only)
 */
export async function GET() {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    let settings = await SiteSettings.findOne({ key: 'global' }).lean();

    if (!settings) {
      // Create default settings
      settings = await SiteSettings.create({
        key: 'global',
        announcementBanner: {
          enabled: true,
          announcements: [
            { text: 'Free Shipping Above ₹499', emoji: '🚚', isActive: true },
            { text: 'Boost Your Daily Nutrition with TAPTIFS', emoji: '✨', isActive: true },
          ],
        },
        heroSlider: { slides: [] },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Update site settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    const body = await request.json();
    const { announcementBanner, heroSlider } = body;

    const updateFields: Record<string, any> = {};
    if (announcementBanner !== undefined) updateFields.announcementBanner = announcementBanner;
    if (heroSlider !== undefined) updateFields.heroSlider = heroSlider;

    const settings = await SiteSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
