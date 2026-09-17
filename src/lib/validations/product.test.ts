import { describe, it, expect } from 'vitest';
import { productSchema, productUpdateSchema } from './product';

/**
 * The composition rule: salts + dosage form are mandatory by default, but a
 * product ticked "no composition" (brushes/devices) may skip them. Enforced by
 * the superRefine on the exported schemas — this is the server-side guard the
 * API relies on, so it's worth pinning down.
 */

const base = () => ({
  name: 'Dolo 650',
  slug: 'dolo-650',
  sku: 'PMS-ANA-D65',
  category: 'a'.repeat(24),
  price: 30.5,
  stock: 100,
  images: [{ url: 'https://example.com/x.jpg', publicId: 'x' }],
  salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' as const }],
  form: 'tablet' as const,
  manufacturer: 'Micro Labs',
  packSize: 15,
  packUnit: 'tablet',
});

describe('productSchema composition rule', () => {
  it('accepts a normal medicine with salts + form', () => {
    expect(productSchema.safeParse(base()).success).toBe(true);
  });

  it('rejects empty salts when noComposition is false', () => {
    const r = productSchema.safeParse({ ...base(), salts: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === 'salts')).toBe(true);
  });

  it('rejects a missing dosage form when noComposition is false', () => {
    const { form, ...noForm } = base();
    const r = productSchema.safeParse(noForm);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === 'form')).toBe(true);
  });

  it('accepts empty salts + no form when noComposition is true', () => {
    const { form, ...rest } = base();
    const r = productSchema.safeParse({ ...rest, salts: [], noComposition: true });
    expect(r.success).toBe(true);
  });
});

describe('productSchema expiryDate', () => {
  it('accepts a YYYY-MM-DD string', () => {
    expect(productSchema.safeParse({ ...base(), expiryDate: '2027-05-01' }).success).toBe(true);
  });

  it('accepts an empty string (field left blank)', () => {
    expect(productSchema.safeParse({ ...base(), expiryDate: '' }).success).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(productSchema.safeParse({ ...base(), expiryDate: '01/05/2027' }).success).toBe(false);
  });
});

describe('productUpdateSchema', () => {
  it('allows a partial update that omits composition fields', () => {
    expect(productUpdateSchema.safeParse({ stock: 5 }).success).toBe(true);
  });

  it('rejects a partial update that explicitly empties salts (no noComposition)', () => {
    expect(productUpdateSchema.safeParse({ salts: [] }).success).toBe(false);
  });
});
