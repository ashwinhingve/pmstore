import { describe, it, expect } from 'vitest';
import { supplierSchema } from './supplier';

describe('supplierSchema', () => {
  it('accepts a name-only supplier and defaults isActive true', () => {
    const parsed = supplierSchema.parse({ name: 'Medico Agencies' });
    expect(parsed.isActive).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(supplierSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('tolerates blank optional fields but rejects a malformed email', () => {
    expect(supplierSchema.safeParse({ name: 'X', phone: '', email: '' }).success).toBe(true);
    expect(supplierSchema.safeParse({ name: 'X', email: 'not-an-email' }).success).toBe(false);
  });
});
