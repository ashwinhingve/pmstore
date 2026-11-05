import { describe, it, expect } from 'vitest';
import {
  DELETION_REQUEST_SUBJECT,
  buildDeletionRequestMessage,
} from './deletion-request';

describe('buildDeletionRequestMessage', () => {
  it('names the account and states it is a deletion request', () => {
    const msg = buildDeletionRequestMessage({ accountEmail: 'customer@example.com' });
    expect(DELETION_REQUEST_SUBJECT.toLowerCase()).toContain('deletion');
    expect(msg.toLowerCase()).toContain('deletion');
    expect(msg).toContain('customer@example.com');
  });

  it('includes the stated reason when given', () => {
    const msg = buildDeletionRequestMessage({
      accountEmail: 'a@b.com',
      reason: '  moving to a different pharmacy  ',
    });
    // trimmed, verbatim
    expect(msg).toContain('moving to a different pharmacy');
    expect(msg).not.toContain('  moving');
  });

  it('notes when no reason is given instead of leaving it blank', () => {
    const msg = buildDeletionRequestMessage({ accountEmail: 'a@b.com', reason: '   ' });
    expect(msg.toLowerCase()).toContain('no reason');
  });
});
