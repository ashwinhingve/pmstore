/**
 * GST Utility — Tapti Food & Spices
 *
 * Seller state: Madhya Pradesh (GSTIN: 23GGLPD7346M1ZZ)
 * Intra-state sale (customer in MP) → CGST + SGST (split equally)
 * Inter-state sale (customer outside MP) → IGST
 *
 * Product prices in the DB are GST-INCLUSIVE (MRP).
 * GST is extracted from the inclusive price — never added on top.
 */

export const SELLER_STATE = 'Madhya Pradesh';
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GSTRate = (typeof GST_RATES)[number];

/**
 * Extract the base (taxable) amount and GST from a GST-inclusive price.
 * Formula: base = inclusive / (1 + rate/100)
 */
export function extractGST(
  inclusivePrice: number,
  gstRate: number
): { base: number; gst: number } {
  if (gstRate === 0) return { base: inclusivePrice, gst: 0 };
  const base = inclusivePrice / (1 + gstRate / 100);
  const gst = inclusivePrice - base;
  return {
    base: Math.round(base * 100) / 100,
    gst: Math.round(gst * 100) / 100,
  };
}

export interface GSTBreakdown {
  taxableValue: number; // subtotal minus total GST
  taxAmount: number;    // total GST
  cgst: number;
  sgst: number;
  igst: number;
  isIntraState: boolean;
}

/**
 * Calculate the GST breakdown for an entire order.
 * @param items - each item's inclusive price per unit, quantity, and GST rate
 * @param customerState - the state from the shipping address
 */
export function calculateOrderGST(
  items: Array<{ inclusivePrice: number; quantity: number; gstRate: number }>,
  customerState: string
): GSTBreakdown {
  const isIntraState =
    customerState.trim().toLowerCase() === SELLER_STATE.toLowerCase();

  let totalBase = 0;
  let totalGst = 0;

  for (const item of items) {
    const { base, gst } = extractGST(item.inclusivePrice, item.gstRate);
    totalBase += base * item.quantity;
    totalGst += gst * item.quantity;
  }

  totalBase = Math.round(totalBase * 100) / 100;
  totalGst = Math.round(totalGst * 100) / 100;

  return {
    taxableValue: totalBase,
    taxAmount: totalGst,
    cgst: isIntraState ? Math.round((totalGst / 2) * 100) / 100 : 0,
    sgst: isIntraState ? Math.round((totalGst / 2) * 100) / 100 : 0,
    igst: isIntraState ? 0 : totalGst,
    isIntraState,
  };
}

/**
 * Effective GST rate label for display (e.g., "2.5% CGST + 2.5% SGST" or "5% IGST")
 */
export function gstLabel(gstRate: number, isIntraState: boolean): string {
  if (gstRate === 0) return 'GST Exempt';
  if (isIntraState) {
    const half = gstRate / 2;
    return `CGST ${half}% + SGST ${half}%`;
  }
  return `IGST ${gstRate}%`;
}
