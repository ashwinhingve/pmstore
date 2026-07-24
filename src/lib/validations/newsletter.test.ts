import { describe, it, expect } from 'vitest';
import { newsletterSchema } from './newsletter';

describe('newsletterSchema', () => {
  it('accepts a valid email', () => {
    const result = newsletterSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('lowercases and trims the email', () => {
    const result = newsletterSchema.parse({ email: '  USER@EXAMPLE.COM  ' });
    expect(result.email).toBe('user@example.com');
  });

  it('accepts an optional source', () => {
    const result = newsletterSchema.parse({ email: 'user@example.com', source: 'homepage' });
    expect(result.source).toBe('homepage');
  });

  it('rejects an invalid email', () => {
    expect(newsletterSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a missing email', () => {
    expect(newsletterSchema.safeParse({}).success).toBe(false);
  });

  it('allows source to be undefined', () => {
    const result = newsletterSchema.parse({ email: 'user@example.com' });
    expect(result.source).toBeUndefined();
  });
});
