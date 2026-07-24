import { describe, it, expect } from 'vitest';
import { buildReminderDocs, type DeliveredLine, type RefillProduct } from './refill-schedule';

const delivered = new Date('2026-01-01T00:00:00.000Z');

function lines(...ls: DeliveredLine[]): DeliveredLine[] {
  return ls;
}

describe('buildReminderDocs', () => {
  it('creates one due-dated reminder per eligible line', () => {
    const docs = buildReminderDocs(
      'u1',
      'o1',
      delivered,
      lines(
        { orderItemId: 'i1', productId: 'p1', quantity: 1 },
        { orderItemId: 'i2', productId: 'p2', quantity: 2 }
      ),
      { p1: { packSize: 30 }, p2: { packSize: 15 } } as Record<string, RefillProduct>
    );
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({ userId: 'u1', orderId: 'o1', orderItemId: 'i1', productId: 'p1' });
    // 30 * 1 * 0.85 = 25 days after delivery.
    expect(docs[0].dueAt.toISOString()).toBe('2026-01-26T00:00:00.000Z');
  });

  it('skips a line whose product is unknown', () => {
    const docs = buildReminderDocs(
      'u1',
      'o1',
      delivered,
      lines({ orderItemId: 'i1', productId: 'missing', quantity: 1 }),
      {}
    );
    expect(docs).toEqual([]);
  });

  it('skips a line whose supply cannot be estimated (zero pack/qty)', () => {
    const docs = buildReminderDocs(
      'u1',
      'o1',
      delivered,
      lines(
        { orderItemId: 'i1', productId: 'p1', quantity: 0 },
        { orderItemId: 'i2', productId: 'p2', quantity: 1 }
      ),
      { p1: { packSize: 30 }, p2: { packSize: 0 } } as Record<string, RefillProduct>
    );
    expect(docs).toEqual([]);
  });
});
