import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import { getShippingProvider } from './providerFactory';
import { defaultPickupDate } from './delhivery';

/**
 * Ask the order's courier to collect the parcel. Requires a shipment (waybill)
 * to already exist — pickup is the step after creating the shipment.
 *
 * Shiprocket schedules a pickup per shipment. Delhivery schedules ONE warehouse
 * pickup per day and rejects a second same-day request, so the first Delhivery
 * order of the day books the pickup and later same-day orders reuse its id.
 *
 * @param orderId     MongoDB ObjectId string
 * @param pickupDate  YYYY-MM-DD. Delhivery only; omit to use the IST default.
 */
export async function requestPickupForOrder(
  orderId: string,
  pickupDate?: string
): Promise<{
  success: boolean;
  pickupId?: string;
  scheduledDate?: string;
  reused?: boolean;
  error?: string;
}> {
  try {
    await connectDB();

    const shipment = await Shipment.findOne({ orderId });
    if (!shipment) {
      return { success: false, error: 'Create a shipment before requesting pickup' };
    }

    // Local hand-delivery orders are fulfilled by store staff — no courier pickup.
    if (shipment.provider === 'manual') {
      return { success: false, error: 'Local delivery — no courier pickup needed' };
    }

    // Idempotency: pickup already requested for this shipment.
    if (shipment.pickupId) {
      return {
        success: true,
        pickupId: shipment.pickupId,
        scheduledDate: shipment.pickupScheduledDate?.toISOString().split('T')[0],
      };
    }

    const provider = shipment.provider as 'delhivery' | 'shiprocket';
    const service = getShippingProvider(provider);

    // ── Delhivery: reuse the day's pickup rather than raising a conflicting one ──
    if (provider === 'delhivery') {
      const targetDate = pickupDate || defaultPickupDate();
      const scheduledDateObj = new Date(targetDate); // UTC midnight of the target day

      const existing = await Shipment.findOne({
        provider: 'delhivery',
        pickupId: { $nin: [null, ''] },
        pickupScheduledDate: scheduledDateObj,
      }).sort({ pickupRequestedAt: -1 });

      if (existing?.pickupId) {
        shipment.pickupId = existing.pickupId;
        shipment.pickupScheduledDate = existing.pickupScheduledDate;
        shipment.pickupStatus = 'Scheduled';
        shipment.pickupRequestedAt = new Date();
        shipment.scans.push({
          status: 'Pickup scheduled',
          location: 'Warehouse',
          timestamp: new Date(),
          remarks: `Reused Delhivery pickup ${existing.pickupId} for ${targetDate}`,
        });
        await shipment.save();
        return { success: true, pickupId: existing.pickupId, scheduledDate: targetDate, reused: true };
      }

      // Best-effort estimate of parcels awaiting a Delhivery pickup (incl. this one).
      const packageCount = await Shipment.countDocuments({
        provider: 'delhivery',
        pickupId: { $in: [null, ''] },
      });

      const result = await service.requestPickup({
        providerShipmentId: shipment.providerShipmentId,
        pickupDate: targetDate,
        packageCount: Math.max(1, packageCount),
      });

      if (!result.success || !result.result) {
        return { success: false, error: result.error || 'Delhivery pickup request failed' };
      }

      return persistPickup(shipment, provider, result.result.pickupId, targetDate);
    }

    // ── Shiprocket: per-shipment pickup ─────────────────────────────────────────
    const result = await service.requestPickup({
      providerShipmentId: shipment.providerShipmentId,
      pickupDate,
    });

    if (!result.success || !result.result) {
      return { success: false, error: result.error || 'Shiprocket pickup request failed' };
    }

    return persistPickup(shipment, provider, result.result.pickupId, result.result.scheduledDate);
  } catch (error: any) {
    console.error('Error in requestPickupForOrder:', error);
    return { success: false, error: error.message };
  }
}

async function persistPickup(
  shipment: any,
  provider: string,
  pickupId: string,
  scheduledDate?: string
): Promise<{ success: boolean; pickupId?: string; scheduledDate?: string }> {
  shipment.pickupId = pickupId;
  shipment.pickupStatus = 'Scheduled';
  shipment.pickupScheduledDate = scheduledDate ? new Date(scheduledDate) : undefined;
  shipment.pickupRequestedAt = new Date();
  shipment.scans.push({
    status: 'Pickup scheduled',
    location: 'Warehouse',
    timestamp: new Date(),
    remarks: `Pickup requested via ${provider}${pickupId ? ` — ${pickupId}` : ''}`,
  });
  await shipment.save();

  console.log(`Pickup requested via ${provider} for order ${shipment.orderId} — pickup ${pickupId || '(queued)'}`);
  return { success: true, pickupId, scheduledDate };
}
