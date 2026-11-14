import { chargeableWeightGrams, parcelSchema, type CourierEstimate, type ParcelMeasurements } from './parcel';
import { z } from 'zod';

const chargeResponse = z.array(z.object({
  total_amount: z.union([z.number(), z.string()])
    .transform(Number).pipe(z.number().finite().positive()),
})).length(1);

/** Read-only estimate. total_amount already includes the provider's taxes. */
export async function estimateDelhivery(
  parcel: ParcelMeasurements,
  destinationPincode: string,
  paymentMode: 'prepaid' | 'cod',
  codAmount: number,
  originOverride?: string,
): Promise<CourierEstimate> {
  parcelSchema.parse({ weightGrams: parcel.weightGrams, lengthCm: parcel.lengthCm, widthCm: parcel.widthCm, heightCm: parcel.heightCm });
  const apiKey = process.env.DELHIVERY_API_KEY?.trim();
  const originPincode = originOverride ?? process.env.DELHIVERY_RETURN_PINCODE?.trim();
  if (!apiKey || !originPincode || !/^\d{6}$/.test(originPincode)) {
    throw new Error('Configure Delhivery credentials and the registered pickup PIN to fetch an estimate.');
  }
  if (!/^\d{6}$/.test(destinationPincode)) throw new Error('A valid destination PIN is required.');
  const weight = chargeableWeightGrams(parcel);
  const params = new URLSearchParams({
    md: 'S', ss: 'Delivered', o_pin: originPincode, d_pin: destinationPincode,
    cgm: String(weight), pt: paymentMode === 'cod' ? 'COD' : 'Pre-paid',
    cod: String(paymentMode === 'cod' ? codAmount : 0),
  });
  const base = (process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com').trim().replace(/\/$/, '');
  const response = await fetch(`${base}/api/kinko/v1/invoice/charges/.json?${params}`, {
    headers: { Authorization: `Token ${apiKey}` },
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Delhivery could not provide an estimate. Check the account and pickup PIN.');
  const parsed = chargeResponse.safeParse(await response.json());
  if (!parsed.success) throw new Error('Delhivery returned no usable estimate. Check the rate in Delhivery One.');
  return {
    total: Math.round(parsed.data[0].total_amount * 100) / 100,
    currency: 'INR', estimatedAt: new Date(), chargeableWeightGrams: weight,
    paymentMode, codAmount: paymentMode === 'cod' ? codAmount : 0,
    originPincode, destinationPincode, service: 'Surface',
  };
}
