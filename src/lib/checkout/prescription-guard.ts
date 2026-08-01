/**
 * Server-side prescription helpers.
 *
 * NOTE (2026-08-01): per client policy, prescription upload is now OPTIONAL at
 * checkout — `create-order` no longer calls `assertPrescriptionForCart`, so this
 * no longer blocks any order (see CLAUDE.md rule #3). The functions below are
 * retained, still tested, and ready to re-enable if the pharmacy reinstates the
 * hard gate; do not delete them.
 *
 * Schedule H / H1 / X products historically could not be checked out without a
 * prescription. Kept as pure functions over already-loaded documents so they are
 * reusable across web routes and unit-testable without HTTP.
 *
 * A pharmacy treats a paper prescription as valid for ~6 months; an attached
 * prescription in `pending` or `verified` state lets the order proceed (staff
 * verify from the queue afterwards). `rejected`, `expired`, one belonging to a
 * different user, or none at all must all fail closed.
 */

import type { PrescriptionStatus } from '@/models/Prescription';

/** Statuses that permit checkout. Verification can happen after the order. */
const CHECKOUT_OK: PrescriptionStatus[] = ['pending', 'verified'];

/** Indian prescriptions are generally treated as valid for 6 months. */
const PRESCRIPTION_VALIDITY_MS = 1000 * 60 * 60 * 24 * 182;

/** Thrown when a cart needs a prescription that isn't validly attached. */
export class PrescriptionRequiredError extends Error {
  readonly status = 400;
  constructor(
    message = 'This order includes prescription medicines. Attach a valid prescription to continue.',
  ) {
    super(message);
    this.name = 'PrescriptionRequiredError';
  }
}

export interface RxProduct {
  prescriptionRequired?: boolean;
}

export interface RxPrescription {
  userId: unknown;
  status: PrescriptionStatus;
  issueDate?: Date | null;
}

/** True if any product in the cart legally requires a prescription. */
export function cartRequiresPrescription(products: RxProduct[]): boolean {
  return products.some((p) => p.prescriptionRequired === true);
}

function isExpired(issueDate: Date | null | undefined, now: number): boolean {
  if (!issueDate) return false; // no issue date on file — not treated as expired
  return now - new Date(issueDate).getTime() > PRESCRIPTION_VALIDITY_MS;
}

/**
 * Throw unless the cart is clear to check out. No-op when no item needs a
 * prescription. `userId` is the authenticated user's id as a string.
 */
export function assertPrescriptionForCart(
  products: RxProduct[],
  prescription: RxPrescription | null | undefined,
  userId: string,
  now: number = Date.now(),
): void {
  if (!cartRequiresPrescription(products)) return;

  if (!prescription) {
    throw new PrescriptionRequiredError();
  }
  if (String(prescription.userId) !== userId) {
    throw new PrescriptionRequiredError();
  }
  if (!CHECKOUT_OK.includes(prescription.status)) {
    throw new PrescriptionRequiredError(
      'The attached prescription can no longer be used. Upload a current one to continue.',
    );
  }
  if (isExpired(prescription.issueDate, now)) {
    throw new PrescriptionRequiredError(
      'The attached prescription has expired. Upload a current one to continue.',
    );
  }
}
