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
 * Suggest salts for a typed query. Prefix matches rank above substring matches,
 * and a known alias (e.g. "acetaminophen" → paracetamol) surfaces the canonical
 * entry so a misremembered name still finds the right salt.
 */
export function suggestSalts(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_SALTS.slice(0, limit);

  const starts: string[] = [];
  const contains: string[] = [];
  for (const salt of COMMON_SALTS) {
    const s = salt.toLowerCase();
    if (s.startsWith(q)) starts.push(salt);
    else if (s.includes(q)) contains.push(salt);
  }

  // Alias hit: map a typed synonym to the canonical salt's proper-cased entry.
  const aliasHits: string[] = [];
  const canonical = SALT_ALIASES[q];
  if (canonical) {
    const match = COMMON_SALTS.find((s) => s.toLowerCase().startsWith(canonical));
    if (match && !starts.includes(match) && !contains.includes(match)) aliasHits.push(match);
  }

  return [...starts, ...aliasHits, ...contains].slice(0, limit);
}
