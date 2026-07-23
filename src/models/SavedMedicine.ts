import mongoose, { Schema, Document } from 'mongoose';

/**
 * A medicine a customer saved to reorder later (docs/01-DATA-MODEL.md).
 * Replaces the WishlistItem stub. One row per user per product.
 */
export interface ISavedMedicine extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SavedMedicineSchema = new Schema<ISavedMedicine>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true, collection: 'saved_medicines' }
);

// One save per user per product; also the lookup index for "is this saved?".
SavedMedicineSchema.index({ userId: 1, productId: 1 }, { unique: true });
SavedMedicineSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.SavedMedicine ||
  mongoose.model<ISavedMedicine>('SavedMedicine', SavedMedicineSchema);
