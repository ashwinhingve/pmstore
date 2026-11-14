import { describe, expect, it } from 'vitest';
import { partnerBillingInputSchema } from './partner-billing';
describe('verified courier expense recording', () => {
  const billing = { amount: 89, reference: 'wallet-debit-test', source: 'wallet', status: 'paid', chargeDate: new Date().toISOString(), expectedVersion: 0, verified: true };
  it('accepts verified actual charges without implying a customer fee', () => {
    expect(partnerBillingInputSchema.parse(billing).amount).toBe(89);
    expect(partnerBillingInputSchema.safeParse({ ...billing, source: 'invoice', status: 'unpaid' }).success).toBe(true);
  });
  it('rejects forged metadata, unverified charges, invalid amounts and contradictory wallet state', () => {
    for (const amount of [-1, NaN, Infinity, 1.234]) expect(partnerBillingInputSchema.safeParse({ ...billing, amount }).success).toBe(false);
    expect(partnerBillingInputSchema.safeParse({ ...billing, verified: false }).success).toBe(false);
    expect(partnerBillingInputSchema.safeParse({ ...billing, recordedBy: 'forged' }).success).toBe(false);
    expect(partnerBillingInputSchema.safeParse({ ...billing, status: 'unpaid' }).success).toBe(false);
  });
});
