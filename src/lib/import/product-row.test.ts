import { describe, it, expect } from 'vitest';
import { parseProductRow } from './product-row';

// Mirrors templates/product-import-template.csv row shape (already trimmed keys).
function row(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    sku: 'PMS-0001',
    name: 'Dolo 650',
    brand: 'Dolo',
    manufacturer: 'Micro Labs',
    category: 'Pain Relief',
    salt_1_name: 'Paracetamol',
    salt_1_strength: '650',
    salt_1_unit: 'mg',
    salt_2_name: '',
    salt_2_strength: '',
    salt_2_unit: '',
    form: 'tablet',
    pack_size: '15',
    pack_unit: 'tablet',
    price: '30.50',
    mrp: '36.00',
    gst_rate: '12',
    stock: '120',
    prescription_required: 'FALSE',
    schedule_class: 'OTC',
    hsn_code: '30049099',
    short_description: 'Paracetamol 650mg tablet for fever and pain',
    storage_instructions: 'Store below 30C',
    usage_instructions: 'One tablet after food',
    side_effects: 'Nausea|Rash',
    contraindications: 'Liver disease|Alcohol dependence',
    image_url_1: 'https://example.com/dolo1.jpg',
    image_url_2: '',
    is_active: 'TRUE',
    ...overrides,
  };
}

describe('parseProductRow', () => {
  it('parses a valid single-salt row', () => {
    const r = parseProductRow(row());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sku).toBe('PMS-0001');
    expect(r.value.salts).toHaveLength(1);
    expect(r.value.salts[0]).toEqual({ name: 'Paracetamol', strength: 650, unit: 'mg' });
    expect(r.value.price).toBe(30.5);
    expect(r.value.prescriptionRequired).toBe(false);
    expect(r.value.isActive).toBe(true);
    // categoryName is passed through as text — the script resolves it to an ObjectId.
    expect(r.value.categoryName).toBe('Pain Relief');
  });

  it('parses a multi-salt row and reads salt columns dynamically', () => {
    const r = parseProductRow(
      row({
        sku: 'PMS-0003',
        name: 'Augmentin 625 Duo',
        salt_1_name: 'Amoxicillin',
        salt_1_strength: '500',
        salt_1_unit: 'mg',
        salt_2_name: 'Clavulanic Acid',
        salt_2_strength: '125',
        salt_2_unit: 'mg',
        schedule_class: 'H',
        prescription_required: 'TRUE',
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.salts).toHaveLength(2);
    expect(r.value.salts[1].name).toBe('Clavulanic Acid');
  });

  it('splits pipe-separated side effects and contraindications', () => {
    const r = parseProductRow(row());
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.sideEffects).toEqual(['Nausea', 'Rash']);
    expect(r.value.contraindications).toEqual(['Liver disease', 'Alcohol dependence']);
  });

  it('collects non-empty image URLs in order', () => {
    const r = parseProductRow(row({ image_url_2: 'https://example.com/dolo2.jpg' }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.imageUrls).toEqual([
      'https://example.com/dolo1.jpg',
      'https://example.com/dolo2.jpg',
    ]);
  });

  it('rejects a row with no sku', () => {
    const r = parseProductRow(row({ sku: '  ' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/sku/i);
  });

  it('rejects a row with a non-numeric price', () => {
    const r = parseProductRow(row({ price: 'abc' }));
    expect(r.ok).toBe(false);
  });

  it('rejects a row with an invalid salt unit', () => {
    const r = parseProductRow(row({ salt_1_unit: 'milligram' }));
    expect(r.ok).toBe(false);
  });

  it('rejects a row with an unknown dosage form', () => {
    const r = parseProductRow(row({ form: 'lozenge' }));
    expect(r.ok).toBe(false);
  });

  it('imports a row with no salt data as inactive (never live without a composition)', () => {
    const r = parseProductRow(
      row({ salt_1_name: '', salt_1_strength: '', salt_1_unit: '', is_active: 'TRUE' })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.salts).toHaveLength(0);
    expect(r.value.isActive).toBe(false);
  });

  it('forces prescriptionRequired true for a Schedule H/H1/X drug even if the CSV says FALSE', () => {
    const r = parseProductRow(row({ schedule_class: 'H1', prescription_required: 'FALSE' }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.prescriptionRequired).toBe(true);
  });

  it('keeps sku as the idempotency key on the parsed output', () => {
    const r = parseProductRow(row({ sku: 'PMS-9999' }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.sku).toBe('PMS-9999');
  });
});
