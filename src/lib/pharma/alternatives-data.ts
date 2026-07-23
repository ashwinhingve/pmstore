/**
 * Data access for the Strip. DB shell around the pure `buildStrip`.
 *
 * Selects every field the ranking needs (stock, manufacturer, ratings,
 * orderCount) — the product page's `relatedProducts` projection is lighter, so
 * the Strip fetches its own. Out-of-stock brands are included on purpose; the
 * Strip dims and sorts them last.
 */
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import { buildStrip, type StripProductInput, type StripViewModel } from './strip';

const STRIP_FIELDS =
  '_id name slug manufacturer price mrp packSize packUnit unitPrice stock averageRating totalReviews orderCount salts form compositionKey';

export async function getAlternatives(slug: string): Promise<StripViewModel | null> {
  await connectDB();

  const current = await Product.findOne({ slug, isActive: true })
    .select(STRIP_FIELDS)
    .lean<(StripProductInput & { _id: unknown; compositionKey?: string }) | null>();

  if (!current) return null;

  // No composition → can't group. Return a single-item strip (the component
  // renders nothing for <2 items).
  if (!current.compositionKey) {
    return buildStrip([current], String(current._id));
  }

  const products = await Product.find({ compositionKey: current.compositionKey, isActive: true })
    .select(STRIP_FIELDS)
    .lean<StripProductInput[]>();

  return buildStrip(products, String(current._id));
}
