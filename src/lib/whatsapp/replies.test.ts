import { describe, it, expect } from 'vitest';
import { buildReply, AUTO_REPLY } from './replies';

describe('buildReply', () => {
  it('returns the single Hindi acknowledgement for any message', () => {
    for (const input of [
      'hi',
      'namaste',
      'delivery charge kitna hai',
      'prescription kaise upload karu',
      'asdfghjkl',
    ]) {
      expect(buildReply(input)).toBe(AUTO_REPLY);
    }
  });

  it('is a short Hindi acknowledgement that asks for 4–6 hours', () => {
    expect(AUTO_REPLY).toMatch(/धन्यवाद/);
    expect(AUTO_REPLY).toMatch(/घंटे का समय/);
    // 2–3 lines
    expect(AUTO_REPLY.split('\n').length).toBeGreaterThanOrEqual(2);
    expect(AUTO_REPLY.split('\n').length).toBeLessThanOrEqual(3);
  });

  it('never returns an empty reply', () => {
    for (const input of ['', '   ', '🙂', 'random text here']) {
      expect(buildReply(input).length).toBeGreaterThan(0);
    }
  });
});
