import mongoose, { Schema, Document } from 'mongoose';

/**
 * A persisted catalogue of manufacturer names the admin has added. It exists so
 * the product form's manufacturer field can suggest names the pharmacy already
 * uses, keeping spelling consistent (products are filtered and grouped by
 * manufacturer, so "Cipla" vs "cipla ltd" fragmenting the list is a real problem).
 *
 * `nameLower` is derived from `name` and carries the unique index, so a
 * case-variant duplicate ("Cipla" vs "cipla") is rejected while the admin's
 * original casing is preserved for display.
 */
export interface IManufacturerCatalog extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameLower: string;
  createdAt: Date;
  updatedAt: Date;
}

const manufacturerCatalogSchema = new Schema<IManufacturerCatalog>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // DERIVED in pre('validate') — name.trim().toLowerCase(). Never hand-entered.
    nameLower: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Derive the lowercase key from the display name before required-validation runs.
manufacturerCatalogSchema.pre('validate', function (next) {
  if (this.isModified('name') && typeof this.name === 'string') {
    this.nameLower = this.name.trim().toLowerCase();
  }
  next();
});

const ManufacturerCatalog =
  mongoose.models.ManufacturerCatalog ||
  mongoose.model<IManufacturerCatalog>('ManufacturerCatalog', manufacturerCatalogSchema);

export default ManufacturerCatalog;
