import { describe, it, expect } from 'vitest';
import {
  assertPrescriptionForCart,
  cartRequiresPrescription,
  PrescriptionRequiredError,
  type RxProduct,
  type RxPrescription,
} from './prescription-guard';

/**
 * Server-side Rx enforcement (root CLAUDE.md rule #3). Schedule H/H1/X items
 * cannot check out without a valid prescription in `pending` or `verified`.
 * Everything else — missing, rejected, expired, another user's — fails closed.
 */

const USER = 'user-1';
const NOW = 1_700_000_000_000; // fixed clock for deterministic expiry checks
const rx: RxProduct[] = [{ prescriptionRequired: false }, { prescriptionRequired: true }];
const otc: RxProduct[] = [{ prescriptionRequired: false }, {}];

function presc(over: Partial<RxPrescription> = {}): RxPrescription {
  return { userId: USER, status: 'pending', ...over };
}

describe('cartRequiresPrescription', () => {
  it('is true when any item requires a prescription', () => {
    expect(cartRequiresPrescription(rx)).toBe(true);
  });
  it('is false for an all-OTC cart', () => {
    expect(cartRequiresPrescription(otc)).toBe(false);
  });
});

describe('assertPrescriptionForCart', () => {
  it('does nothing for an OTC cart with no prescription', () => {
    expect(() => assertPrescriptionForCart(otc, null, USER, NOW)).not.toThrow();
  });

  it('accepts a pending prescription for the same user', () => {
    expect(() => assertPrescriptionForCart(rx, presc({ status: 'pending' }), USER, NOW)).not.toThrow();
  });

  it('accepts a verified prescription', () => {
    expect(() => assertPrescriptionForCart(rx, presc({ status: 'verified' }), USER, NOW)).not.toThrow();
  });

  it('rejects an Rx cart with no prescription attached', () => {
    expect(() => assertPrescriptionForCart(rx, null, USER, NOW)).toThrow(PrescriptionRequiredError);
  });

  it("rejects another user's prescription", () => {
    expect(() =>
      assertPrescriptionForCart(rx, presc({ userId: 'someone-else' }), USER, NOW),
    ).toThrow(PrescriptionRequiredError);
  });

  it('rejects a rejected prescription', () => {
    expect(() => assertPrescriptionForCart(rx, presc({ status: 'rejected' }), USER, NOW)).toThrow(
      PrescriptionRequiredError,
    );
  });

  it('rejects an expired-status prescription', () => {
    expect(() => assertPrescriptionForCart(rx, presc({ status: 'expired' }), USER, NOW)).toThrow(
      PrescriptionRequiredError,
    );
  });

  it('rejects a prescription older than 6 months by issue date', () => {
    const old = new Date(NOW - 1000 * 60 * 60 * 24 * 200); // 200 days ago
    expect(() =>
      assertPrescriptionForCart(rx, presc({ status: 'pending', issueDate: old }), USER, NOW),
    ).toThrow(PrescriptionRequiredError);
  });

  it('accepts a recent issue date within 6 months', () => {
    const recent = new Date(NOW - 1000 * 60 * 60 * 24 * 30); // 30 days ago
    expect(() =>
      assertPrescriptionForCart(rx, presc({ status: 'verified', issueDate: recent }), USER, NOW),
    ).not.toThrow();
  });

  it('carries a 400 status on the error for the route to surface', () => {
    try {
      assertPrescriptionForCart(rx, null, USER, NOW);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrescriptionRequiredError);
      expect((err as PrescriptionRequiredError).status).toBe(400);
    }
  });
});
