import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { ensureSiteSettings } from '@/lib/site-settings';
import SiteSettings from '@/models/SiteSettings';
import { siteSettingsUpdateSchema } from '@/lib/validations/site-settings';
import { createErrorResponse } from '@/lib/utils/errorHandler';

export async function GET() {
  try {
    const access = await verifyAdminAccess();
    if (access.error) return access.error;
    return NextResponse.json({ success: true, settings: await ensureSiteSettings() });
  } catch (error) { return createErrorResponse(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) return access.error;
    const parsed = siteSettingsUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(issue => issue.message).join('; ') }, { status: 400 });
    await ensureSiteSettings();
    const settings = await SiteSettings.findOneAndUpdate({ key: 'global' }, { $set: parsed.data }, { new: true, runValidators: true });
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, settings });
  } catch (error) { return createErrorResponse(error); }
}
