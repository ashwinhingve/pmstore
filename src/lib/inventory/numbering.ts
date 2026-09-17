import Counter from '@/models/Counter';

/**
 * Human-readable reference numbers for inventory documents — PUR-202609-0001,
 * PRET-202609-0003. The month is scoped to IST (like the rest of the app, see
 * src/lib/pharma/expiry.ts) so the period a document lands in matches the local
 * business day. Each `{prefix}-{period}` has its own Counter document; the seq
 * is incremented atomically so two concurrent purchases can never collide.
 */

/** "202609" — year+month in IST. */
function istPeriod(date: Date): string {
  // en-CA formats as YYYY-MM; strip the hyphen.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
  return parts.replace('-', '');
}

/** Atomically increment and return the next value of a named counter. */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq as number;
}

/** Mint the next reference for a prefix, e.g. nextRef('PUR') -> "PUR-202609-0001". */
export async function nextRef(prefix: string, date: Date = new Date()): Promise<string> {
  const period = istPeriod(date);
  const seq = await nextSequence(`${prefix}-${period}`);
  return `${prefix}-${period}-${String(seq).padStart(4, '0')}`;
}
