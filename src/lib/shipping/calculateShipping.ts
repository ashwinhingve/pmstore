export interface ShippingTier {
  name: 'free' | 'standard' | 'express';
  cost: number;
  estimatedDays: number;
}

export interface ShippingBreakdown {
  baseRate: number;
  weightCharge: number;
  distanceCharge: number;
  total: number;
}

export interface ShippingCalculation {
  tier: ShippingTier;
  breakdown: ShippingBreakdown;
}

// Weight tiers (in grams)
const WEIGHT_TIERS = [
  { max: 500, rate: 0 },       // 0-500g: included in base
  { max: 1000, rate: 20 },     // 500g-1kg: +₹20
  { max: 2000, rate: 40 },     // 1-2kg: +₹40
  { max: 5000, rate: 80 },     // 2-5kg: +₹80
  { max: Infinity, rate: 150 } // 5kg+: +₹150
];

// Cart value tiers
interface ValueTier {
  min: number;
  max: number;
  baseCost: number;
  name: 'free' | 'standard' | 'express';
}

const VALUE_TIERS: ValueTier[] = [
  { min: 0, max: 299, baseCost: 30, name: 'standard' },
  { min: 300, max: 499, baseCost: 20, name: 'standard' },
  { min: 500, max: 999, baseCost: 0, name: 'free' },
  { min: 1000, max: Infinity, baseCost: 0, name: 'free' }
];

/**
 * Calculate shipping cost based on hybrid model (cart value + weight + distance)
 *
 * @param cartTotal - Total cart value in rupees
 * @param cartWeight - Total cart weight in grams
 * @param postalCode - Destination PIN code
 * @returns ShippingCalculation with tier, cost breakdown, and estimated delivery
 */
export function calculateShipping(
  cartTotal: number,
  cartWeight: number,
  postalCode: string
): ShippingCalculation {
  // Find value tier
  const valueTier = VALUE_TIERS.find(
    tier => cartTotal >= tier.min && cartTotal < tier.max
  ) || VALUE_TIERS[VALUE_TIERS.length - 1];

  // Find weight tier
  const weightTier = WEIGHT_TIERS.find(
    tier => cartWeight <= tier.max
  ) || WEIGHT_TIERS[WEIGHT_TIERS.length - 1];

  // Calculate distance-based charge
  const distanceCharge = calculateDistanceCharge(postalCode);

  const breakdown: ShippingBreakdown = {
    baseRate: valueTier.baseCost,
    weightCharge: weightTier.rate,
    distanceCharge: distanceCharge,
    total: valueTier.baseCost + weightTier.rate + distanceCharge
  };

  // Estimate delivery days based on tier
  let estimatedDays = 5; // Default standard delivery
  if (breakdown.total === 0) {
    estimatedDays = 3; // Free shipping (slightly slower)
  } else if (breakdown.total > 100) {
    estimatedDays = 2; // Express (heavier/expensive items, faster)
  }

  return {
    tier: {
      name: valueTier.name,
      cost: breakdown.total,
      estimatedDays
    },
    breakdown
  };
}

/**
 * Calculate distance-based shipping charge using PIN code difference
 *
 * @param postalCode - Destination PIN code
 * @returns Distance charge in rupees
 */
function calculateDistanceCharge(postalCode: string): number {
  // Get base PIN from environment or use default (Mumbai: 400001)
  const basePinString = process.env.DELHIVERY_RETURN_PINCODE || '400001';
  const basePin = parseInt(basePinString.replace(/\D/g, ''), 10);
  const destPin = parseInt(postalCode.replace(/\D/g, ''), 10);

  if (isNaN(basePin) || isNaN(destPin)) {
    return 20; // Default regional charge if PIN is invalid
  }

  const diff = Math.abs(basePin - destPin);

  // PIN code ranges indicate distance
  if (diff < 10000) return 0;      // Local (same city/nearby)
  if (diff < 50000) return 20;     // Regional (nearby states)
  if (diff < 100000) return 40;    // National (mid-distance)
  return 60;                        // Far regions (Northeast, J&K, etc.)
}

/**
 * Get free shipping threshold
 */
export function getFreeShippingThreshold(): number {
  return 500;
}

/**
 * Check if order qualifies for free shipping
 */
export function qualifiesForFreeShipping(cartTotal: number): boolean {
  return cartTotal >= getFreeShippingThreshold();
}

/**
 * Get shipping tier name as display string
 */
export function getShippingTierDisplay(tierName: string): string {
  switch (tierName) {
    case 'free':
      return 'Free Shipping';
    case 'standard':
      return 'Standard Shipping';
    case 'express':
      return 'Express Shipping';
    default:
      return 'Shipping';
  }
}
