import { SALT_ALIASES } from './composition';

/**
 * A curated shortlist of the salts/formulas a small Indian pharmacy enters most
 * often, so the admin can pick from a dropdown instead of retyping the same
 * names (and spelling them consistently — the Strip groups brands by a
 * normalised composition key, so "Amoxycillin" vs "Amoxicillin" matters).
 *
 * This is a *suggestion* list, not a whitelist: the combobox always accepts free
 * text for anything not listed here. Keep entries in the canonical spelling used
 * on the strip label (Title Case, "+" between combined salts).
 */
export const COMMON_SALTS: string[] = [
  'Paracetamol',
  'Ibuprofen',
  'Aceclofenac',
  'Diclofenac',
  'Aspirin',
  'Amoxicillin',
  'Amoxicillin + Clavulanic Acid',
  'Azithromycin',
  'Cefixime',
  'Ciprofloxacin',
  'Ofloxacin',
  'Metronidazole',
  'Doxycycline',
  'Pantoprazole',
  'Omeprazole',
  'Rabeprazole',
  'Domperidone',
  'Ondansetron',
  'Ranitidine',
  'Cetirizine',
  'Levocetirizine',
  'Fexofenadine',
  'Montelukast',
  'Metformin',
  'Glimepiride',
  'Amlodipine',
  'Telmisartan',
  'Losartan',
  'Atorvastatin',
  'Rosuvastatin',
  'Cholecalciferol (Vitamin D3)',
  'Vitamin B Complex',
  'Ascorbic Acid (Vitamin C)',
  'Folic Acid',
];

/**
 * Merge the compiled shortlist with an admin-added `extra` pool, de-duplicated
 * case-insensitively. The base entry wins on casing, so "Paracetamol" is never
 * shadowed by a later "paracetamol".
 */
function mergedPool(extra: string[]): string[] {
  const seen = new Set(COMMON_SALTS.map((s) => s.toLowerCase()));
  const out = [...COMMON_SALTS];
  for (const salt of extra) {
    const key = salt.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(salt.trim());
    }
  }
  return out;
}

/**
 * Suggest salts for a typed query. Prefix matches rank above substring matches,
 * and a known alias (e.g. "acetaminophen" → paracetamol) surfaces the canonical
 * entry so a misremembered name still finds the right salt. `extra` carries any
 * salts the admin has added to the catalogue, merged on top of the base list.
 */
export function suggestSalts(query: string, limit = 8, extra: string[] = []): string[] {
  const pool = mergedPool(extra);
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, limit);

  const starts: string[] = [];
  const contains: string[] = [];
  for (const salt of pool) {
    const s = salt.toLowerCase();
    if (s.startsWith(q)) starts.push(salt);
    else if (s.includes(q)) contains.push(salt);
  }

  // Alias hit: map a typed synonym to the canonical salt's proper-cased entry.
  const aliasHits: string[] = [];
  const canonical = SALT_ALIASES[q];
  if (canonical) {
    const match = pool.find((s) => s.toLowerCase().startsWith(canonical));
    if (match && !starts.includes(match) && !contains.includes(match)) aliasHits.push(match);
  }

  return [...starts, ...aliasHits, ...contains].slice(0, limit);
}

/**
 * Whether `name` is already a suggestible salt — in the base shortlist or the
 * admin-added `extra` pool — compared case-insensitively. The combobox uses this
 * to decide whether to offer an "Add to salt list" action for a typed name.
 */
export function isKnownSalt(name: string, extra: string[] = []): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return mergedPool(extra).some((s) => s.toLowerCase() === key);
}
