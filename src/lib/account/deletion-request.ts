/**
 * Account deletion request — shared shape + message builder.
 *
 * A deletion request is a message, not a destructive action: it is persisted and
 * emailed to the store (via the existing contact pipeline) so staff can process
 * it while honouring the records they are legally required to retain (pharmacy
 * and tax rules). Nothing is deleted automatically. The only personal detail the
 * message carries is the account email — the identity staff need to find and
 * action the account. No phone, address or prescription data (root rule #6).
 */

/** Fixed subject so these land recognisably in the admin enquiry queue. */
export const DELETION_REQUEST_SUBJECT = 'Account deletion request';

export interface DeletionRequestInput {
  /** The email that identifies the account to delete. */
  accountEmail: string;
  /** Optional free-text reason from the customer. */
  reason?: string;
}

/**
 * Compose the human-readable message a deletion request is stored and sent as.
 * Deterministic and side-effect free so it is unit-testable without a DB or SMTP.
 */
export function buildDeletionRequestMessage({
  accountEmail,
  reason,
}: DeletionRequestInput): string {
  const trimmedReason = reason?.trim();
  const reasonLine = trimmedReason ? trimmedReason : 'No reason given.';
  return [
    'Account deletion request submitted from the /delete-account page.',
    `Account email: ${accountEmail}`,
    `Reason: ${reasonLine}`,
  ].join('\n');
}
