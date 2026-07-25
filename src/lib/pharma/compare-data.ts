/**
 * Data access for the /compare page. DB shell around the pure
 * `buildCompareViewModel` — fetches up to two active products by id,
 * preserves the requested order, and serializes at the boundary.
 *
 * Keyed on the raw CSV string (not an array) so React `cache()` can dedupe
 * the generateMetadata and page calls within one request.
 */
import { cache } from 'react';
import { isValidObjectId } from 'mongoose';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import type { CompareProduct } from './compare';
import type { DosageForm, Salt } from './composition';

const COMPARE_FIELDS =
  '_id name slug manufacturer price mrp packSize packUnit unitPrice stock scheduleClass prescriptionRequired salts form compositionKey';

interface LeanCompareDoc {
  _id: unknown;
  name: string;
  slug: string;
  manufacturer: string;
  price: number;
  mrp?: number;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  stock: number;
  scheduleClass?: string;
  prescriptionRequired?: boolean;
  salts: Salt[];
  form: DosageForm;
  compositionKey: string;
}

export const getCompareProducts = cache(async (idsCsv: string): Promise<CompareProduct[]> => {
  const ids = [
    ...new Set(
      idsCsv
        .split(',')
        .map((s) => s.trim())
        .filter((id) => isValidObjectId(id))
    ),
  ].slice(0, 2);

  if (ids.length === 0) return [];

  await connectDB();
  const docs = await Product.find({ _id: { $in: ids }, isActive: true })
    .select(COMPARE_FIELDS)
    .lean<LeanCompareDoc[]>();

  const byId = new Map(docs.map((d) => [String(d._id), d]));

  return ids
    .map((id) => byId.get(id))
    .filter((d): d is LeanCompareDoc => Boolean(d))
    .map((d) => ({
      _id: String(d._id),
      name: d.name,
      slug: d.slug,
      manufacturer: d.manufacturer,
      price: d.price,
      mrp: d.mrp,
      packSize: d.packSize,
      packUnit: d.packUnit,
      unitPrice: d.unitPrice,
      stock: d.stock,
      scheduleClass: d.scheduleClass,
      prescriptionRequired: d.prescriptionRequired,
      salts: (d.salts ?? []).map((s) => ({ name: s.name, strength: s.strength, unit: s.unit })),
      form: d.form,
      compositionKey: d.compositionKey,
    }));
});
