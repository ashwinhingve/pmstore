import mongoose, { Schema, Document } from 'mongoose';

/**
 * A persisted catalogue of salt names the admin has added, on top of the
 * compiled shortlist in src/lib/pharma/common-salts.ts. It exists so the salt
 * autocomplete can suggest names the pharmacy uses that aren't in the base list,
 * keeping spelling consistent across products (the Strip groups brands by a
 * normalised composition key, so consistent salt names matter).
 *
 * `nameLower` is derived from `name` and carries the unique index, so a
 * case-variant duplicate ("Norfloxacin" vs "norfloxacin") is rejected while the
 * admin's original casing is preserved for display.
 */
export interface ISaltCatalog extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameLower: string;
  createdAt: Date;
  updatedAt: Date;
}

const saltCatalogSchema = new Schema<ISaltCatalog>(
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
saltCatalogSchema.pre('validate', function (next) {
  if (this.isModified('name') && typeof this.name === 'string') {
    this.nameLower = this.name.trim().toLowerCase();
  }
  next();
});

const SaltCatalog =
  mongoose.models.SaltCatalog ||
  mongoose.model<ISaltCatalog>('SaltCatalog', saltCatalogSchema);

export default SaltCatalog;
