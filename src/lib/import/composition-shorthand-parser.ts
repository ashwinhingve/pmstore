/**
 * Parser for composition shorthand text (e.g. "Paracetamol 650mg + Caffeine 50mg")
 * into a structured salts array that the API expects.
 *
 * Used in the grid to let admins type a compact representation while still
 * sending the fully structured BulkProductRow to the API.
 */

import { normalizeSaltName, normalizeForm } from '@/lib/pharma/composition';
import type { Salt, SaltUnit, DosageForm } from '@/lib/pharma/composition';

export interface ParsedSalt {
  name: string;
  strength: number;
  unit: SaltUnit;
}

export interface CompositionParseResult {
  ok: boolean;
  salts?: ParsedSalt[];
  error?: string;
}

const VALID_UNITS: SaltUnit[] = ['mg', 'mcg', 'g', 'ml', 'iu', '%'];
const DOSAGE_FORMS: DosageForm[] = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection',
  'cream', 'ointment', 'gel', 'drops', 'inhaler',
  'powder', 'sachet', 'spray', 'patch', 'other',
];

/**
 * Parse shorthand composition text into a salts array.
 *
 * Examples:
 *   "Paracetamol 650mg" -> [{name: "Paracetamol", strength: 650, unit: "mg"}]
 *   "Paracetamol 650mg + Caffeine 50mg" -> [
 *     {name: "Paracetamol", strength: 650, unit: "mg"},
 *     {name: "Caffeine", strength: 50, unit: "mg"}
 *   ]
 *   "Amoxicillin 500mg + Clavulanic Acid 125mg" -> [...]
 *
 * Empty input returns {ok: true, salts: []}.
 * Malformed input returns {ok: false, error: "..."}.
 *
 * The parser is lenient with spacing and case (e.g. "Paracetamol  650  mg" works).
 * Salt names are normalized (see normalizeSaltName), so aliases collapse.
 */
export function parseCompositionShorthand(text: string): CompositionParseResult {
  if (!text || !text.trim()) {
    return { ok: true, salts: [] };
  }

  const text_trimmed = text.trim();

  // Split by '+' to get individual salt+strength pairs
  const parts = text_trimmed.split('+').map((p) => p.trim());

  const salts: ParsedSalt[] = [];

  for (const part of parts) {
    if (!part) continue;

    const parsed = parseSaltPart(part);
    if (!parsed.ok) {
      return parsed;
    }

    salts.push(parsed.salt!);
  }

  if (salts.length === 0) {
    return { ok: true, salts: [] };
  }

  return { ok: true, salts };
}

/**
 * Parse a single salt part (e.g. "Paracetamol 650mg").
 *
 * Format: name + strength + unit
 * The name is everything up to the last group of (number unit).
 */
function parseSaltPart(
  part: string
): { ok: boolean; salt?: ParsedSalt; error?: string } {
  const part_trimmed = part.trim();
  if (!part_trimmed) {
    return { ok: true, salt: undefined };
  }

  // Try to match pattern: name + strength + unit
  // Examples:
  //   "Paracetamol 650mg"
  //   "Caffeine 50 mg"
  //   "Vitamin C 500 mcg"
  //
  // Strategy: find the last occurrence of (digits)(space?)(unit)
  // Everything before it is the name.

  // Match: one or more digits (possibly with decimal), optional space, then a known unit
  const unitPattern = `(mg|mcg|g|ml|iu|%)`;
  const strengthPattern = `(\\d+(?:\\.\\d+)?)\\s*${unitPattern}`;
  const regex = new RegExp(`^(.+?)\\s+${strengthPattern}$`, 'i');

  const match = part_trimmed.match(regex);
  if (!match) {
    return {
      ok: false,
      error: `"${part_trimmed}" doesn't match pattern "Name Strength Unit" (e.g. "Paracetamol 650mg")`,
    };
  }

  const [, namePart, strengthStr, unitStr] = match;
  const name = namePart.trim();
  const strength = parseFloat(strengthStr);
  const unit = unitStr.toLowerCase() as SaltUnit;

  if (!name) {
    return { ok: false, error: `No salt name found in "${part_trimmed}"` };
  }

  if (!Number.isFinite(strength) || strength <= 0) {
    return {
      ok: false,
      error: `Invalid strength "${strengthStr}" in "${part_trimmed}" (must be > 0)`,
    };
  }

  if (!VALID_UNITS.includes(unit)) {
    return {
      ok: false,
      error: `Invalid unit "${unitStr}" in "${part_trimmed}" (must be one of: ${VALID_UNITS.join(', ')})`,
    };
  }

  // Normalize the salt name to collapse aliases and variants
  const normalizedName = normalizeSaltName(name);

  return {
    ok: true,
    salt: {
      name: normalizedName,
      strength,
      unit,
    },
  };
}

/**
 * Serialize a salts array back to shorthand for display/editing.
 * Used to prefill the grid from existing products or templates.
 *
 * Example: [{name: "Paracetamol", strength: 650, unit: "mg"}] -> "Paracetamol 650mg"
 */
export function saltsToshorthand(salts: Salt[] | ParsedSalt[]): string {
  if (!salts || salts.length === 0) return '';

  return salts
    .map((s) => {
      // Render strength without unnecessary decimals
      const strengthStr = Number.isInteger(s.strength)
        ? String(s.strength)
        : s.strength.toString();
      return `${s.name} ${strengthStr}${s.unit}`;
    })
    .join(' + ');
}

/**
 * Normalize and validate a form enum.
 */
export function normalizeAndValidateForm(form: string): { ok: boolean; form?: DosageForm; error?: string } {
  if (!form || !form.trim()) {
    return { ok: false, error: 'Dosage form is required' };
  }

  const normalized = normalizeForm(form.toLowerCase() as DosageForm);
  if (!DOSAGE_FORMS.includes(normalized)) {
    return {
      ok: false,
      error: `Invalid dosage form "${form}". Must be one of: ${DOSAGE_FORMS.join(', ')}`,
    };
  }

  return { ok: true, form: normalized };
}
