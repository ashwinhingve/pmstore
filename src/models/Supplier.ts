import mongoose, { Schema, Document } from 'mongoose';

/**
 * A supplier is who the pharmacy BUYS stock from — a distributor or wholesaler.
 * This is deliberately separate from the manufacturer (who MAKES the drug, kept
 * as a string on Product + the ManufacturerCatalog name list): one distributor
 * supplies many manufacturers' brands, and we owe money to the distributor, not
 * the manufacturer.
 *
 * `nameLower` is derived from `name` and carries the unique index, so a
 * case-variant duplicate ("Medico Agencies" vs "medico agencies") is rejected
 * while the admin's original casing is preserved for display — mirrors
 * ManufacturerCatalog.
 */
export interface ISupplier extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameLower: string; // DERIVED — name.trim().toLowerCase(); unique
  gstin?: string;
  drugLicenseNo?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    // DERIVED in pre('validate') — name.trim().toLowerCase(). Never hand-entered.
    nameLower: { type: String, required: true, unique: true, index: true },
    gstin: { type: String, trim: true, uppercase: true },
    drugLicenseNo: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Derive the lowercase key from the display name before required-validation runs.
SupplierSchema.pre('validate', function (next) {
  if (this.isModified('name') && typeof this.name === 'string') {
    this.nameLower = this.name.trim().toLowerCase();
  }
  next();
});

export default mongoose.models.Supplier ||
  mongoose.model<ISupplier>('Supplier', SupplierSchema);
