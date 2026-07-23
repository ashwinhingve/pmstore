import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import MarketingSettings from '@/models/MarketingSettings';

const marketingSchema = z.object({
  gtm_id: z
    .string()
    .regex(/^(GTM-[A-Z0-9]+)?$/, 'Invalid GTM Container ID (e.g. GTM-XXXXXXX)')
    .optional()
    .default(''),
  gtm_enabled: z.boolean().optional().default(false),
  google_analytics_id: z
    .string()
    .regex(/^(G-[A-Z0-9]+)?$/, 'Invalid GA4 Measurement ID (e.g. G-XXXXXXXXXX)')
    .optional()
    .default(''),
  google_ads_conversion_id: z
    .string()
    .regex(/^(AW-[0-9]+)?$/, 'Invalid Google Ads Conversion ID (e.g. AW-123456789)')
    .optional()
    .default(''),
  google_ads_label: z
    .string()
    .regex(/^[A-Za-z0-9_-]*$/, 'Invalid conversion label')
    .optional()
    .default(''),
  meta_pixel_id: z
    .string()
    .regex(/^[0-9]*$/, 'Pixel ID must be numeric')
    .optional()
    .default(''),
  search_console_verified: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    let settings = await MarketingSettings.findOne({ key: 'global' }).lean();

    if (!settings) {
      settings = await MarketingSettings.create({ key: 'global' });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching marketing settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (adminCheck.error) return adminCheck.error;

    await connectDB();

    const body = await request.json();
    const parsed = marketingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const settings = await MarketingSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: parsed.data },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error saving marketing settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
