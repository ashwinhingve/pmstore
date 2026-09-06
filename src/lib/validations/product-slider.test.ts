import { describe, it, expect } from 'vitest';
import { productSliderSchema } from './product-slider';

describe('productSliderSchema', () => {
  it('should validate an empty product ID array', () => {
    const result = productSliderSchema.safeParse({ productIds: [] });
    expect(result.success).toBe(true);
  });

  it('should validate an array of valid ObjectIds', () => {
    const validId = '507f1f77bcf86cd799439011';
    const result = productSliderSchema.safeParse({
      productIds: [validId, validId],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid ObjectId format', () => {
    const result = productSliderSchema.safeParse({
      productIds: ['invalid-id'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invalid product ID');
    }
  });

  it('should reject more than 14 products', () => {
    const validId = '507f1f77bcf86cd799439011';
    const tooMany = Array(15).fill(validId);
    const result = productSliderSchema.safeParse({
      productIds: tooMany,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Maximum 14');
    }
  });

  it('should accept exactly 14 products', () => {
    const validId = '507f1f77bcf86cd799439011';
    const exactly14 = Array(14).fill(validId);
    const result = productSliderSchema.safeParse({
      productIds: exactly14,
    });
    expect(result.success).toBe(true);
  });
});
