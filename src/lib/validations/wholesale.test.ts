import { describe, it, expect } from 'vitest';
import { wholesaleEnquirySchema, monthlyVolumeLabel } from './wholesale';

const valid = {
  businessName: 'Sharma Medicals',
  contactPerson: 'Anil Sharma',
  phone: '9876543210',
  email: 'anil@sharmameds.in',
};

describe('wholesaleEnquirySchema', () => {
  it('accepts the required fields only', () => {
    const r = wholesaleEnquirySchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('lowercases the email', () => {
    const r = wholesaleEnquirySchema.safeParse({ ...valid, email: 'Anil@Sharmameds.in' });
    expect(r.success && r.data.email).toBe('anil@sharmameds.in');
  });

  it('rejects a bad phone number', () => {
    expect(wholesaleEnquirySchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
    expect(wholesaleEnquirySchema.safeParse({ ...valid, phone: '1234567890' }).success).toBe(false);
  });

  it('rejects a bad email', () => {
    expect(wholesaleEnquirySchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('requires a business name and contact person', () => {
    expect(wholesaleEnquirySchema.safeParse({ ...valid, businessName: '' }).success).toBe(false);
    expect(wholesaleEnquirySchema.safeParse({ ...valid, contactPerson: '' }).success).toBe(false);
  });

  it('allows optional fields to be empty', () => {
    const r = wholesaleEnquirySchema.safeParse({
      ...valid,
      gstNumber: '',
      pincode: '',
      monthlyVolume: '',
      notes: '',
    });
    expect(r.success).toBe(true);
  });

  it('validates GSTIN format when provided', () => {
    expect(wholesaleEnquirySchema.safeParse({ ...valid, gstNumber: '27AAPFU0939F1ZV' }).success).toBe(true);
    expect(wholesaleEnquirySchema.safeParse({ ...valid, gstNumber: 'INVALID' }).success).toBe(false);
  });

  it('validates a 6-digit pincode when provided', () => {
    expect(wholesaleEnquirySchema.safeParse({ ...valid, pincode: '440001' }).success).toBe(true);
    expect(wholesaleEnquirySchema.safeParse({ ...valid, pincode: '44001' }).success).toBe(false);
  });

  it('rejects a filled honeypot', () => {
    expect(wholesaleEnquirySchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
  });
});

describe('monthlyVolumeLabel', () => {
  it('maps known values to labels', () => {
    expect(monthlyVolumeLabel('1L-5L')).toBe('₹1 lakh – ₹5 lakh');
  });
  it('returns undefined for empty', () => {
    expect(monthlyVolumeLabel('')).toBeUndefined();
  });
});
