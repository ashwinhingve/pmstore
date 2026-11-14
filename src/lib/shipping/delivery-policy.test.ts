import { describe, expect, it } from 'vitest';
import { deliveryPolicySchema, EMPTY_DELIVERY_POLICY, evaluateDelivery, shouldPromoteDelivery, type DeliveryPolicy } from './delivery-policy';

export function testPolicy(): DeliveryPolicy {
  return { defaultPickupLocationId: 'warehouse-a', pickupLocations: [{ id: 'warehouse-a', name: 'Test warehouse', active: true, delhiveryWarehouse: 'Registered Test', shiprocketWarehouse: 'Test SR', pincode: '462041', address: 'Test pickup address', city: 'Bhopal', state: 'Madhya Pradesh', country: 'India', phone: '9999999999', freeDeliveryPincodes: ['110001'] }], freeDelivery: { enabled: true, showInBanner: true, bannerText: 'FREE DELIVERY on selected locations' } };
}
describe('customer delivery policy', () => {
  it('waives the fee once only for a configured origin and destination', () => {
    const policy = testPolicy();
    expect(evaluateDelivery(100, 200, '110001', policy)).toMatchObject({ shippingCost: 0, reason: 'location' });
    expect(evaluateDelivery(100, 200, '110002', policy).shippingCost).toBeGreaterThan(0);
    policy.defaultPickupLocationId = 'other';
    expect(evaluateDelivery(100, 200, '110001', policy).shippingCost).toBeGreaterThan(0);
  });
  it('keeps existing local and threshold benefits and normal fees when disabled', () => {
    const policy = testPolicy(); policy.freeDelivery.enabled = false;
    expect(evaluateDelivery(100, 200, '110001', policy).shippingCost).toBeGreaterThan(0);
    expect(evaluateDelivery(499, 2000, '110001', policy)).toMatchObject({ shippingCost: 0, reason: 'threshold' });
    expect(evaluateDelivery(100, 200, '462041', policy)).toMatchObject({ shippingCost: 0, reason: 'local' });
    expect(evaluateDelivery(100, 200, '462041', EMPTY_DELIVERY_POLICY).shippingCost).toBe(0);
  });
  it('does not hand-deliver from a different city or advertise inactive rules', () => {
    const policy = testPolicy(); policy.pickupLocations[0].pincode = '110001';
    expect(evaluateDelivery(100, 200, '462041', policy).reason).toBe('normal');
    policy.pickupLocations[0].active = false;
    expect(shouldPromoteDelivery(policy)).toBe(false);
    expect(deliveryPolicySchema.safeParse(policy).success).toBe(false);
  });
  it('requires valid explicit locations and a qualified announcement before activation', () => {
    expect(deliveryPolicySchema.safeParse(EMPTY_DELIVERY_POLICY).success).toBe(true);
    expect(deliveryPolicySchema.safeParse({ ...EMPTY_DELIVERY_POLICY, freeDelivery: { ...EMPTY_DELIVERY_POLICY.freeDelivery, enabled: true } }).success).toBe(false);
    const policy = testPolicy(); policy.pickupLocations[0].freeDeliveryPincodes = ['bad'];
    expect(deliveryPolicySchema.safeParse(policy).success).toBe(false);
    policy.pickupLocations[0].freeDeliveryPincodes = ['110001']; policy.freeDelivery.bannerText = 'Free everywhere';
    expect(deliveryPolicySchema.safeParse(policy).success).toBe(false);
  });
});
