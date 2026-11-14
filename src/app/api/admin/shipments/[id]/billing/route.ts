import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import { partnerBillingInputSchema } from '@/lib/validations/partner-billing';
import Shipment from '@/models/Shipment';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await verifyAdminAccess();
    if (access.error) return access.error;
    const id = z.string().regex(/^[a-f\d]{24}$/i).safeParse((await context.params).id);
    const body = partnerBillingInputSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return NextResponse.json({ error: body.success ? 'Invalid shipment.' : body.error.issues.map(issue => issue.message).join('; ') }, { status: 400 });
    const { expectedVersion, amount, reference, source, status, chargeDate } = body.data;
    const entry = { amount, reference, source, status, chargeDate: new Date(chargeDate), recordedBy: String(access.session.user.id), recordedAt: new Date() };
    const shipment = await Shipment.findOneAndUpdate({
      _id: id.data, provider: { $in: ['delhivery', 'shiprocket'] },
      ...(expectedVersion === 0 ? { $or: [{ billingVersion: 0 }, { billingVersion: { $exists: false } }] } : { billingVersion: expectedVersion }),
    }, { $set: { partnerBilling: entry }, $push: { billingHistory: entry }, $inc: { billingVersion: 1 } }, { new: true, runValidators: true });
    if (!shipment) return NextResponse.json({ error: 'Shipment is unavailable, local, or billing changed. Refresh before saving.' }, { status: 409 });
    return NextResponse.json({ success: true, billing: shipment.partnerBilling, version: shipment.billingVersion });
  } catch (error) { return createErrorResponse(error); }
}
