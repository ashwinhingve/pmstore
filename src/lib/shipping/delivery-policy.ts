import { z } from 'zod';
import { CONTACT, FREE_SHIPPING_THRESHOLD, isManualDeliveryPincode } from '@/lib/constants';
import { calculateShipping } from './calculateShipping';

const pin = z.string().trim().regex(/^[1-9]\d{5}$/);
export const pickupLocationSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
  name: z.string().trim().min(1).max(100),
  active: z.boolean(),
  delhiveryWarehouse: z.string().trim().max(100).default(''),
  shiprocketWarehouse: z.string().trim().max(100).default(''),
  pincode: pin,
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.literal('India').default('India'),
  phone: z.string().trim().regex(/^\+?[\d -]{10,16}$/),
  freeDeliveryPincodes: z.array(pin).max(1000).transform(values => [...new Set(values)]),
}).strict().refine(location => !location.active || !!(location.delhiveryWarehouse || location.shiprocketWarehouse), 'An active pickup needs a registered courier warehouse name');

export const DEFAULT_DELIVERY_MESSAGE = 'FREE DELIVERY on Selected Locations! Order Now & Save on Delivery Charges! 🎉';
export const deliveryPolicySchema = z.object({
  pickupLocations: z.array(pickupLocationSchema).max(30),
  defaultPickupLocationId: z.string().max(64),
  freeDelivery: z.object({
    enabled: z.boolean(),
    showInBanner: z.boolean(),
    bannerText: z.string().trim().min(1).max(250),
  }).strict(),
}).strict().superRefine((policy, ctx) => {
  const ids = policy.pickupLocations.map(location => location.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Pickup IDs must be unique', path: ['pickupLocations'] });
  const pickup = policy.pickupLocations.find(location => location.id === policy.defaultPickupLocationId && location.active);
  if ((policy.pickupLocations.some(location => location.active) || policy.defaultPickupLocationId) && !pickup) {
    ctx.addIssue({ code: 'custom', message: 'Select an active default pickup location', path: ['defaultPickupLocationId'] });
  }
  if (policy.freeDelivery.enabled && (!pickup || pickup.freeDeliveryPincodes.length === 0)) {
    ctx.addIssue({ code: 'custom', message: 'Configure an active default pickup and eligible destination PINs before enabling the offer', path: ['freeDelivery'] });
  }
  if (policy.freeDelivery.enabled && !/select|eligible/i.test(policy.freeDelivery.bannerText)) {
    ctx.addIssue({ code: 'custom', message: 'The promotion must state that only selected or eligible locations qualify', path: ['freeDelivery', 'bannerText'] });
  }
});

export type PickupLocation = z.infer<typeof pickupLocationSchema>;
export type DeliveryPolicy = z.infer<typeof deliveryPolicySchema>;
export const EMPTY_DELIVERY_POLICY: DeliveryPolicy = {
  pickupLocations: [], defaultPickupLocationId: '',
  freeDelivery: { enabled: false, showInBanner: true, bannerText: DEFAULT_DELIVERY_MESSAGE },
};

export function readDeliveryPolicy(value: unknown): DeliveryPolicy {
  const result = deliveryPolicySchema.safeParse(value);
  return result.success ? result.data : EMPTY_DELIVERY_POLICY;
}

export function defaultPickup(policy: DeliveryPolicy): PickupLocation | undefined {
  return policy.pickupLocations.find(location => location.id === policy.defaultPickupLocationId && location.active);
}

/** Legacy orders retain their existing store-origin hand delivery behavior. */
export function isManualRoute(destination: string, pickup?: Pick<PickupLocation, 'pincode'> | null) {
  return isManualDeliveryPincode(destination) && (!pickup || pickup.pincode === CONTACT.address.postalCode);
}

export function evaluateDelivery(subtotal: number, weightGrams: number, destination: string, policy: DeliveryPolicy) {
  const pickup = defaultPickup(policy);
  const calculation = calculateShipping(subtotal, weightGrams, destination, pickup?.pincode);
  const local = isManualRoute(destination, pickup);
  const locationOffer = policy.freeDelivery.enabled && !!pickup?.freeDeliveryPincodes.includes(destination.trim());
  const reason = local ? 'local' : subtotal >= FREE_SHIPPING_THRESHOLD ? 'threshold' : locationOffer ? 'location' : 'normal';
  const shippingCost = reason === 'normal' ? calculation.tier.cost : 0;
  return { calculation, shippingCost, reason, pickup };
}

export function shouldPromoteDelivery(policy: DeliveryPolicy) {
  const pickup = defaultPickup(policy);
  return policy.freeDelivery.enabled && policy.freeDelivery.showInBanner && !!pickup?.freeDeliveryPincodes.length;
}
