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
