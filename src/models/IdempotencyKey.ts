import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  response: any;
  statusCode: number;
  createdAt: Date;
  expiresAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    response: {
      type: Schema.Types.Mixed,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically delete expired records
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);

export default IdempotencyKey;
