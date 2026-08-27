import mongoose, { Schema, Document } from 'mongoose';

/**
 * A saved, named bulk-import template: a subset of the optional import
 * columns an admin has chosen to include on top of the fixed mandatory set
 * (see `src/lib/import/template-fields.ts`). Lets an admin build/edit/save a
 * simple template once and reuse it for both the downloadable CSV and for
 * scoping import/export column sets — without touching the underlying
 * Product schema or the core import validation.
 *
 * `nameLower` is derived from `name` and carries the unique index, following
 * the same pattern as ManufacturerCatalog/SaltCatalog.
 *
 * `defaultManufacturer`/`defaultSalt` are optional examples baked into the
 * downloaded template's sample row (picked from the real manufacturer/salt
 * catalogues in the admin UI) — they are not live dropdown cells inside the
 * CSV itself, which plain-text spreadsheet files can't do.
 */
export interface IImportTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameLower: string;
  includedOptionalFields: string[];
  defaultManufacturer?: string;
  defaultSalt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const importTemplateSchema = new Schema<IImportTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // DERIVED in pre('validate') — name.trim().toLowerCase(). Never hand-entered.
    nameLower: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    includedOptionalFields: {
      type: [String],
      default: [],
    },
    defaultManufacturer: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    defaultSalt: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

importTemplateSchema.pre('validate', function (next) {
  if (this.isModified('name') && typeof this.name === 'string') {
    this.nameLower = this.name.trim().toLowerCase();
  }
  next();
});

const ImportTemplate =
  mongoose.models.ImportTemplate ||
  mongoose.model<IImportTemplate>('ImportTemplate', importTemplateSchema);

export default ImportTemplate;
