/**
 * One-tap reorder — the diff between a past order and what can go in the cart
 * *today*. Stock sells out, products get discontinued, prices move, and an item
 * that needed no prescription last time might now. This decides, per line, what
 * can be re-added and what has to be flagged for the customer.
 *
 * Pure and DB-free: the route loads the order's items and the current Product
 * docs, hands them here as plain objects, and gets back a ready-to-render diff.
 * That keeps every rule unit-testable without a database.
 */

/** A line item from a past order (the fields reorder actually needs). */
export interface ReorderLine {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
}

/** The current state of a product, as loaded fresh from the catalogue. */
export interface ProductSnapshot {
  _id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  isDiscontinued: boolean;
  prescriptionRequired: boolean;
}

/** Why a past line couldn't be re-added as-is. */
export type SkipReason = 'unavailable' | 'out_of_stock' | 'prescription_required';

export interface AddedItem {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  price: number;
  previousPrice: number;
  priceChanged: boolean;
  /** True when we reduced the requested quantity to what's in stock. */
  quantityAdjusted: boolean;
}

export interface SkippedItem {
  productId: string;
  name: string;
  reason: SkipReason;
}

export interface ReorderDiff {
  added: AddedItem[];
  skipped: SkippedItem[];
}

/**
 * Split a past order's lines into what can be added to the cart now and what
 * can't. Rx items are deliberately skipped rather than silently re-added —
 * checkout enforces prescriptions server-side (CLAUDE.md rule #3), but a
 * cart is the wrong place to surprise someone with a locked item.
 */
export function diffReorder(
  lines: ReorderLine[],
  productsById: Record<string, ProductSnapshot>
): ReorderDiff {
  const added: AddedItem[] = [];
  const skipped: SkippedItem[] = [];

  for (const line of lines) {
    const product = productsById[line.productId];

    if (!product || !product.isActive || product.isDiscontinued) {
      skipped.push({ productId: line.productId, name: line.productName, reason: 'unavailable' });
      continue;
    }
    if (product.stock <= 0) {
      skipped.push({ productId: line.productId, name: product.name, reason: 'out_of_stock' });
      continue;
    }
    if (product.prescriptionRequired) {
      skipped.push({ productId: line.productId, name: product.name, reason: 'prescription_required' });
      continue;
    }

    const quantity = Math.min(line.quantity, product.stock);
    added.push({
      productId: line.productId,
      name: product.name,
      slug: product.slug,
      quantity,
      price: product.price,
      previousPrice: line.priceAtPurchase,
      priceChanged: product.price !== line.priceAtPurchase,
      quantityAdjusted: quantity < line.quantity,
    });
  }

  return { added, skipped };
}
