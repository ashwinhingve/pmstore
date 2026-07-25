import { describe, it, expect } from 'vitest';
import { bulkActiveSchema } from './admin-bulk';

const id = (n: number) => n.toString(16).padStart(24, '0');

describe('bulkActiveSchema', () => {
  it('accepts a list of object ids and a flag', () => {
    const parsed = bulkActiveSchema.parse({ ids: [id(1), id(2)], isActive: false });
    expect(parsed.ids).toHaveLength(2);
    expect(parsed.isActive).toBe(false);
  });

  it('rejects an empty id list', () => {
    expect(() => bulkActiveSchema.parse({ ids: [], isActive: true })).toThrow();
  });

  it('rejects more than 500 ids', () => {
    const ids = Array.from({ length: 501 }, (_, i) => id(i));
    expect(() => bulkActiveSchema.parse({ ids, isActive: true })).toThrow();
  });

  it('rejects ids that are not Mongo object ids', () => {
    expect(() => bulkActiveSchema.parse({ ids: ['not-an-id'], isActive: true })).toThrow();
  });

  it('rejects a missing isActive flag', () => {
    expect(() => bulkActiveSchema.parse({ ids: [id(1)] })).toThrow();
  });
});
