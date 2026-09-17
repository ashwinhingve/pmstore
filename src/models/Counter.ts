import mongoose, { Schema } from 'mongoose';

/**
 * A tiny named-sequence store used to mint human-readable, gap-tolerant
 * reference numbers (PUR-202609-0001, PRET-202609-0003). One document per
 * counter name; `nextSequence()` in src/lib/inventory/numbering.ts increments
 * `seq` atomically with `findOneAndUpdate($inc, upsert)`, so concurrent
 * purchases never collide on a number.
 *
 * Does not extend Document — the `_id` is the counter name (a string), which
 * conflicts with Document's ObjectId `_id`.
 */
export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export default mongoose.models.Counter ||
  mongoose.model<ICounter>('Counter', CounterSchema);
