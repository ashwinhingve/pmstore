import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SiteSettings from '@/models/SiteSettings';

/**
 * GET /api/settings/announcements
 * Public endpoint — returns active announcements for the banner
 */
export async function GET() {
  try {
    await connectDB();

    const settings = await SiteSettings.findOne({ key: 'global' }).lean() as any;

    if (!settings || !settings.announcementBanner?.enabled) {
      return NextResponse.json({ enabled: false, announcements: [] });
    }

    const active = (settings.announcementBanner.announcements || []).filter(
      (a: any) => a.isActive
    );

    return NextResponse.json({
      enabled: true,
      announcements: active.map((a: any) => ({
        text: a.text,
        emoji: a.emoji || '',
      })),
    });
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ enabled: false, announcements: [] });
  }
}
