import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SiteSettings, { type ISiteSettings } from '@/models/SiteSettings';
import { publicAnnouncements } from '@/lib/site-settings';

export async function GET() {
  try {
    await connectDB();
    const settings = await SiteSettings.findOne({ key: 'global' }).lean<ISiteSettings | null>();
    return NextResponse.json(publicAnnouncements(settings), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ enabled: false, announcements: [] }); }
}
