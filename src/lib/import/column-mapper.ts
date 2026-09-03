/**
 * Remaps a raw CSV row keyed by a supplier's own headers onto PMStore's
 * canonical column keys (the same keys `parseProductRow` expects), using a
 * saved import template's `columnMapping`.
 *
 * Unmapped headers pass through unchanged — a column that already matches a
 * canonical name (e.g. "price") needs no entry in the mapping, so an admin
 * only has to map what's actually different about their supplier's file.
 * Mapping every header explicitly would silently drop any column the admin
 * forgot to remap; passing through by original name avoids that.
 */
export function applyColumnMapping(
  raw: Record<string, string>,
  mapping?: Record<string, string> | null,
): Record<string, string> {
  if (!mapping || Object.keys(mapping).length === 0) return raw;

  const out: Record<string, string> = {};
  for (const [header, value] of Object.entries(raw)) {
    out[mapping[header] ?? header] = value;
  }
  return out;
}
