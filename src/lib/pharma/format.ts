/**
 * Presentation formatters for pharma values. Pure — no DB, no React.
 *
 * The mono rule (docs/03-DESIGN-SYSTEM.md): every value with a unit renders in
 * --font-data. These helpers produce the strings; the `.data`/`.price` classes
 * apply the font. `unitPrice` is always the headline number when comparing
 * brands — pack price is secondary.
 */

export type ScheduleClass = 'OTC' | 'H' | 'H1' | 'X' | 'G';

/** ₹30.50 — two decimals, rupee sign. */
export function formatINR(rupees: number): string {
  return `₹${rupees.toFixed(2)}`;
}

const PACK_UNIT_SHORT: Record<string, string> = {
  tablet: 'tab',
  tab: 'tab',
  capsule: 'cap',
  cap: 'cap',
  ml: 'ml',
  g: 'g',
  gm: 'g',
  unit: 'unit',
};

export function packUnitShort(packUnit: string): string {
  return PACK_UNIT_SHORT[packUnit?.toLowerCase()] ?? packUnit;
}

/**
 * Measure units describe a quantity, not a count, so they never pluralise
 * ("100 ml", not "100 mls"). Everything else is a countable pack unit.
 */
const MEASURE_UNITS = new Set(['ml', 'g', 'mg', 'mcg', 'kg', 'l', 'iu', '%']);

/** Canonical display spelling for a unit (e.g. legacy "gm" → "g"). */
export function normalizeUnit(unit: string): string {
  const u = (unit ?? '').trim();
  return u.toLowerCase() === 'gm' ? 'g' : u;
}

/**
 * A unit spelled for its count: "1 tablet" / "15 tablets" / "100 ml".
 * Measure units (ml, g, mg, …) are returned unchanged. Countable pack units
 * (tablet, capsule, strip, bottle, box, piece, …) get an "s" when count ≠ 1.
 */
export function pluralizeUnit(unit: string, count: number): string {
  const u = normalizeUnit(unit);
  if (!u || MEASURE_UNITS.has(u.toLowerCase()) || count === 1) return u;
  return `${u}s`;
}

/** "15 tablets" / "100 ml" / "2 bottles" — pack size with its unit, spelled to match. */
export function formatPack(packSize: number, packUnit: string): string {
  return `${packSize} ${pluralizeUnit(packUnit, packSize)}`;
}

/** ₹2.03/tab — the headline per-unit price. */
export function perUnitLabel(unitPrice: number, packUnit: string): string {
  return `${formatINR(unitPrice)}/${packUnitShort(packUnit)}`;
}

const RX_SCHEDULES: ScheduleClass[] = ['H', 'H1', 'X'];

/** True for schedules that legally require a prescription. */
export function isRxSchedule(scheduleClass: ScheduleClass): boolean {
  return RX_SCHEDULES.includes(scheduleClass);
}

/** "Schedule H" / "Schedule H1" / "Schedule X", or null for OTC/G. */
export function scheduleLabel(scheduleClass: ScheduleClass): string | null {
  return isRxSchedule(scheduleClass) ? `Schedule ${scheduleClass}` : null;
}

/** Whole-percent saving of price vs MRP; 0 when there is no genuine saving. */
export function discountPercent(mrp: number | undefined, price: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
