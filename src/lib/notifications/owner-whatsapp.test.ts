import { describe, it, expect } from 'vitest';
import { buildOwnerOrderMessage, type OwnerOrderAlert } from './owner-whatsapp';

const baseOrder: OwnerOrderAlert = {
  orderNumber: 'ORD-7F3K2-8821',
  items: [
    { name: 'Dolo 650mg strip', quantity: 2 },
    { name: 'Pan-D caps', quantity: 1 },
  ],
  itemCount: 3,
  totalAmount: 540,
  paymentMethod: 'cod',
  prescriptionRequired: true,
};

const ADMIN_URL = 'https://pratigyamedicalstore.com';

describe('buildOwnerOrderMessage', () => {
  it('includes order number, total, payment and the admin link', () => {
    const msg = buildOwnerOrderMessage(baseOrder, ADMIN_URL);
    expect(msg).toContain('ORD-7F3K2-8821');
    expect(msg).toContain('₹540.00');
    expect(msg).toContain('COD (collect cash)');
    expect(msg).toContain(`${ADMIN_URL}/admin/orders`);
  });

  it('lists each item with its quantity', () => {
    const msg = buildOwnerOrderMessage(baseOrder, ADMIN_URL);
    expect(msg).toContain('• Dolo 650mg strip ×2');
    expect(msg).toContain('• Pan-D caps ×1');
  });

  it('flags a prescription-required order for verification', () => {
    expect(buildOwnerOrderMessage(baseOrder, ADMIN_URL)).toContain(
      'Rx required: Yes — verify prescription'
    );
  });

  it('marks an OTC order as not requiring a prescription', () => {
    const otc = { ...baseOrder, prescriptionRequired: false };
    expect(buildOwnerOrderMessage(otc, ADMIN_URL)).toContain('Rx required: No');
  });

  it('labels online (prepaid) orders distinctly from COD', () => {
    const online = { ...baseOrder, paymentMethod: 'upi' };
    const msg = buildOwnerOrderMessage(online, ADMIN_URL);
    expect(msg).toContain('Online (paid)');
    expect(msg).not.toContain('collect cash');
  });

  it('collapses very long item lists to a "+N more" summary', () => {
    const many: OwnerOrderAlert = {
      ...baseOrder,
      items: Array.from({ length: 35 }, (_, i) => ({ name: `Item ${i + 1}`, quantity: 1 })),
      itemCount: 35,
    };
    const msg = buildOwnerOrderMessage(many, ADMIN_URL);
    expect(msg).toContain('• Item 30 ×1');
    expect(msg).not.toContain('• Item 31 ×1');
    expect(msg).toContain('• …+5 more');
  });

  it('carries no customer PII — no phone number or street address (rule #6)', () => {
    const msg = buildOwnerOrderMessage(baseOrder, ADMIN_URL);
    // No 10+ digit phone-like run, and none of the address fields leak in.
    expect(msg).not.toMatch(/\d{10,}/);
    expect(msg.toLowerCase()).not.toContain('address');
    expect(msg).not.toContain('Vikash Kunj');
  });
});
